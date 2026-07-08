import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { EvidenceService } from './evidence.service';
import { TransferDto } from './dto/transfer.dto';

@Controller('evidences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenceController {
  constructor(private evidence: EvidenceService) {}

  @Post()
  @Roles('ADMIN', 'INVESTIGATOR', 'EXPERT')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body('caseId') caseId: string,
    @Body('name') name: string,
    @Body('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtUser,
  ) {
    return this.evidence.create(caseId, name, type, file, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evidence.findOne(id);
  }

  @Post(':id/version')
  @Roles('ADMIN', 'INVESTIGATOR', 'EXPERT')
  @UseInterceptors(FileInterceptor('file'))
  createVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtUser,
  ) {
    return this.evidence.createVersion(id, file, user);
  }

  @Post(':id/transfer')
  transfer(@Param('id') id: string, @Body() dto: TransferDto, @CurrentUser() user: JwtUser) {
    return this.evidence.transfer(id, dto.toUserId, dto.reason, user);
  }

  @Post(':id/verify')
  verify(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.evidence.verify(id, user);
  }
}
