import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [activeCases, totalEvidences, totalTransfers, pendingTx, failedTx, recentActivity] =
      await Promise.all([
        this.prisma.case.count({ where: { status: 'OPEN' } }),
        this.prisma.evidence.count(),
        this.prisma.custodyTransfer.count(),
        this.prisma.blockchainTransaction.count({ where: { status: 'PENDING' } }),
        this.prisma.blockchainTransaction.count({ where: { status: 'FAILED' } }),
        this.prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: 8,
          include: { user: { select: { name: true } } },
        }),
      ]);
    return { activeCases, totalEvidences, totalTransfers, pendingTx, failedTx, recentActivity };
  }
}
