import { Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BlockchainService } from './blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('blockchain')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlockchainController {
  constructor(private blockchain: BlockchainService, private prisma: PrismaService) {}

  @Post('transactions/:id/retry')
  @Roles('ADMIN', 'SUPERVISOR')
  async retry(@Param('id') id: string) {
    const tx = await this.prisma.blockchainTransaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transacao nao encontrada');
    await this.blockchain.processTransaction(id);
    return this.prisma.blockchainTransaction.findUnique({ where: { id } });
  }
}
