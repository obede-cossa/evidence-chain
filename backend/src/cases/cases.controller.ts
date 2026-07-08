import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CasesController {
  constructor(private cases: CasesService) {}

  @Get()
  findAll() {
    return this.cases.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cases.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'INVESTIGATOR')
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: JwtUser) {
    return this.cases.create(dto, user.id);
  }
}
