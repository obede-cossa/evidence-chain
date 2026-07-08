import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  // Todos os perfis autenticados podem listar (necessario para transferencias)
  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtUser) {
    return this.users.create(dto, user.id);
  }
}
