import { Injectable, Logger } from '@nestjs/common';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';

const ABI = [
  'function registerEvidence(string evidenceId, bytes32 sha256Hash, string custodian)',
  'function transferCustody(string evidenceId, string fromUser, string toUser, string reason)',
  'function verifyEvidence(string evidenceId, bytes32 sha256Hash) view returns (bool)',
  'function getEvidence(string evidenceId) view returns (bytes32 sha256Hash, string custodian, uint256 registeredAt, bool exists)',
  'function getHistory(string evidenceId) view returns (tuple(string fromUser, string toUser, string reason, uint256 timestamp)[])',
  'event EvidenceRegistered(bytes32 indexed key, string evidenceId, bytes32 sha256Hash, string custodian, uint256 timestamp)',
  'event CustodyTransferred(bytes32 indexed key, string evidenceId, string fromUser, string toUser, string reason, uint256 timestamp)',
];

export interface ChainVerification {
  available: boolean;
  match?: boolean;
  custodianOnChain?: string;
  registeredAt?: number;
  error?: string;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private contract?: Contract;

  constructor(private prisma: PrismaService) {
    const rpc = process.env.RPC_URL;
    const key = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const address = process.env.CONTRACT_ADDRESS;
    if (rpc && key && address) {
      const provider = new JsonRpcProvider(rpc);
      const wallet = new Wallet(key, provider);
      this.contract = new Contract(address, ABI, wallet);
      this.logger.log('Contrato ligado em ' + address);
    } else {
      this.logger.warn(
        'Blockchain desactivada: defina RPC_URL, BLOCKCHAIN_PRIVATE_KEY e CONTRACT_ADDRESS no .env',
      );
    }
  }

  get enabled(): boolean {
    return !!this.contract;
  }

  private static toBytes32(sha256Hex: string): string {
    return '0x' + sha256Hex.toLowerCase();
  }

  /**
   * Consistencia BD <-> chain: a BD e escrita primeiro (fonte operacional),
   * a transacao on-chain fica PENDING e e processada aqui. Se falhar, o
   * estado passa a FAILED com o erro guardado, e pode ser reprocessada
   * via retry (endpoint /blockchain/transactions/:id/retry).
   */
  async processTransaction(txId: string): Promise<void> {
    const record = await this.prisma.blockchainTransaction.findUnique({ where: { id: txId } });
    if (!record || record.status === 'CONFIRMED') return;

    if (!this.contract) {
      await this.prisma.blockchainTransaction.update({
        where: { id: txId },
        data: { status: 'FAILED', error: 'Blockchain nao configurada' },
      });
      return;
    }

    const payload = record.payload as Record<string, string>;
    try {
      let tx;
      if (record.type === 'REGISTER') {
        tx = await this.contract.registerEvidence(
          payload.evidenceId,
          BlockchainService.toBytes32(payload.sha256),
          payload.custodian,
        );
      } else {
        tx = await this.contract.transferCustody(
          payload.evidenceId,
          payload.fromUser,
          payload.toUser,
          payload.reason,
        );
      }
      const receipt = await tx.wait();
      await this.prisma.blockchainTransaction.update({
        where: { id: txId },
        data: {
          status: 'CONFIRMED',
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber ?? null,
          error: null,
          confirmedAt: new Date(),
        },
      });
      if (record.type === 'TRANSFER' && payload.transferId) {
        await this.prisma.custodyTransfer.update({
          where: { id: payload.transferId },
          data: { txHash: tx.hash },
        });
      }
      this.logger.log(record.type + ' confirmado: ' + tx.hash);
    } catch (err: any) {
      const message = err?.reason ?? err?.shortMessage ?? err?.message ?? 'Erro desconhecido';
      this.logger.error('Falha na transacao ' + txId + ': ' + message);
      await this.prisma.blockchainTransaction.update({
        where: { id: txId },
        data: { status: 'FAILED', error: String(message).slice(0, 500) },
      });
    }
  }

  async verifyOnChain(evidenceId: string, sha256Hex: string): Promise<ChainVerification> {
    if (!this.contract) return { available: false, error: 'Blockchain nao configurada' };
    try {
      const match: boolean = await this.contract.verifyEvidence(
        evidenceId,
        BlockchainService.toBytes32(sha256Hex),
      );
      const [, custodian, registeredAt] = await this.contract.getEvidence(evidenceId);
      return {
        available: true,
        match,
        custodianOnChain: custodian,
        registeredAt: Number(registeredAt),
      };
    } catch (err: any) {
      return {
        available: false,
        error: err?.reason ?? err?.shortMessage ?? 'Evidencia nao encontrada on-chain',
      };
    }
  }
}
