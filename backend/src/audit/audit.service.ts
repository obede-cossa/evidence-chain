import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: { userId, action, entity, entityId, metadata: metadata as any },
    });
  }

  findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
      include: { user: { select: { name: true, email: true, role: true } } },
    });
  }
}
