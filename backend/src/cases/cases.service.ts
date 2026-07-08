import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCaseDto } from './dto/create-case.dto';

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  findAll() {
    return this.prisma.case.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { evidences: true } },
      },
    });
  }

  async findOne(id: string) {
    const found = await this.prisma.case.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, role: true } },
        evidences: {
          orderBy: { createdAt: 'desc' },
          include: {
            currentCustodian: { select: { name: true } },
            transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!found) throw new NotFoundException('Caso nao encontrado');
    return found;
  }

  async create(dto: CreateCaseDto, userId: string) {
    const exists = await this.prisma.case.findUnique({ where: { number: dto.number } });
    if (exists) throw new ConflictException('Numero de caso ja existe');
    const created = await this.prisma.case.create({
      data: { ...dto, createdById: userId },
    });
    await this.audit.log(userId, 'CREATE_CASE', 'Case', created.id, { number: created.number });
    return created;
  }
}
