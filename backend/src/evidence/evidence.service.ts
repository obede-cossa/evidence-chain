import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { JwtUser } from '../auth/jwt.strategy';

@Injectable()
export class EvidenceService {
  private readonly storageDir = process.env.STORAGE_DIR ?? './storage';

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private blockchain: BlockchainService,
  ) {
    if (!existsSync(this.storageDir)) mkdirSync(this.storageDir, { recursive: true });
  }

  private saveFile(evidenceId: string, file: Express.Multer.File): { path: string; sha256: string } {
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = join(this.storageDir, evidenceId + '-' + safeName);
    writeFileSync(path, file.buffer);
    return { path, sha256 };
  }

  async create(
    caseId: string,
    name: string,
    type: string,
    file: Express.Multer.File,
    user: JwtUser,
  ) {
    if (!file) throw new BadRequestException('Ficheiro obrigatorio');
    const found = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!found) throw new NotFoundException('Caso nao encontrado');

    return this.persistEvidence({ caseId, name, type, file, user, parent: null });
  }

  /**
   * Regra de imutabilidade: uma evidencia existente nunca e alterada.
   * "Nova versao" = nova linha Evidence (novo id, novo hash, novo registo
   * on-chain), ligada a anterior via parentEvidenceId.
   */
  async createVersion(parentId: string, file: Express.Multer.File, user: JwtUser) {
    if (!file) throw new BadRequestException('Ficheiro obrigatorio');
    const parent = await this.prisma.evidence.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Evidencia nao encontrada');
    if (parent.currentCustodianId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas o custodiante actual pode criar nova versao');
    }
    return this.persistEvidence({
      caseId: parent.caseId,
      name: parent.name,
      type: parent.type,
      file,
      user,
      parent,
    });
  }

  private async persistEvidence(args: {
    caseId: string;
    name: string;
    type: string;
    file: Express.Multer.File;
    user: JwtUser;
    parent: { id: string; version: number } | null;
  }) {
    const { caseId, name, type, file, user, parent } = args;

    // 1) BD primeiro (fonte operacional)...
    const evidence = await this.prisma.evidence.create({
      data: {
        caseId,
        name: name || file.originalname,
        type: type || file.mimetype,
        sha256: 'pending',
        sizeBytes: file.size,
        storagePath: 'pending',
        version: parent ? parent.version + 1 : 1,
        parentEvidenceId: parent?.id ?? null,
        currentCustodianId: user.id,
        createdById: user.id,
      },
    });

    const { path, sha256 } = this.saveFile(evidence.id, file);
    const updated = await this.prisma.evidence.update({
      where: { id: evidence.id },
      data: { sha256, storagePath: path },
    });

    // 2) ...transacao on-chain criada como PENDING e processada de seguida.
    const tx = await this.prisma.blockchainTransaction.create({
      data: {
        evidenceId: evidence.id,
        type: 'REGISTER',
        payload: { evidenceId: evidence.id, sha256, custodian: user.id },
      },
    });
    await this.blockchain.processTransaction(tx.id);

    await this.audit.log(user.id, parent ? 'CREATE_EVIDENCE_VERSION' : 'CREATE_EVIDENCE', 'Evidence', evidence.id, {
      caseId,
      sha256,
      version: updated.version,
      parentEvidenceId: parent?.id ?? null,
    });

    return this.findOne(evidence.id);
  }

  async findOne(id: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, number: true, title: true } },
        currentCustodian: { select: { id: true, name: true, role: true } },
        createdBy: { select: { name: true } },
        parent: { select: { id: true, version: true, sha256: true } },
        versions: { select: { id: true, version: true, sha256: true, createdAt: true } },
        transfers: {
          orderBy: { transferredAt: 'asc' },
          include: {
            fromUser: { select: { name: true, role: true } },
            toUser: { select: { name: true, role: true } },
          },
        },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!evidence) throw new NotFoundException('Evidencia nao encontrada');
    return evidence;
  }

  /**
   * Regra de negocio: apenas o custodiante actual (ou ADMIN) pode transferir.
   * A mesma regra e verificada on-chain pelo contrato.
   */
  async transfer(evidenceId: string, toUserId: string, reason: string, user: JwtUser) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException('Evidencia nao encontrada');
    if (evidence.currentCustodianId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas o custodiante actual pode transferir esta evidencia');
    }
    if (evidence.currentCustodianId === toUserId) {
      throw new BadRequestException('Destinatario ja e o custodiante actual');
    }
    const toUser = await this.prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser) throw new NotFoundException('Destinatario nao encontrado');

    const fromUserId = evidence.currentCustodianId;

    const [transfer] = await this.prisma.$transaction([
      this.prisma.custodyTransfer.create({
        data: { evidenceId, fromUserId, toUserId, reason },
      }),
      this.prisma.evidence.update({
        where: { id: evidenceId },
        data: { currentCustodianId: toUserId },
      }),
    ]);

    const tx = await this.prisma.blockchainTransaction.create({
      data: {
        evidenceId,
        type: 'TRANSFER',
        payload: {
          evidenceId,
          fromUser: fromUserId,
          toUser: toUserId,
          reason,
          transferId: transfer.id,
        },
      },
    });
    await this.blockchain.processTransaction(tx.id);

    await this.audit.log(user.id, 'TRANSFER_CUSTODY', 'Evidence', evidenceId, {
      fromUserId,
      toUserId,
      reason,
    });

    return this.findOne(evidenceId);
  }

  /**
   * Verificacao tripla: recalcula o hash do ficheiro em disco, compara com a
   * BD e com o registo on-chain. Adulteracao do ficheiro OU da BD e detectada.
   */
  async verify(evidenceId: string, user: JwtUser) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException('Evidencia nao encontrada');

    let recalculated: string | null = null;
    let fileAvailable = true;
    try {
      recalculated = createHash('sha256').update(readFileSync(evidence.storagePath)).digest('hex');
    } catch {
      fileAvailable = false;
    }

    const chain = await this.blockchain.verifyOnChain(evidenceId, evidence.sha256);

    await this.audit.log(user.id, 'VERIFY_EVIDENCE', 'Evidence', evidenceId, {
      fileAvailable,
      dbMatch: recalculated === evidence.sha256,
      chainMatch: chain.match ?? null,
    });

    return {
      evidenceId,
      sha256Db: evidence.sha256,
      sha256Recalculated: recalculated,
      fileAvailable,
      fileMatchesDb: fileAvailable && recalculated === evidence.sha256,
      chain,
      integrity:
        fileAvailable && recalculated === evidence.sha256 && chain.available && chain.match === true,
    };
  }
}
