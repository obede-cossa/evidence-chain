import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn(['ADMIN', 'INVESTIGATOR', 'EXPERT', 'SUPERVISOR'])
  role: 'ADMIN' | 'INVESTIGATOR' | 'EXPERT' | 'SUPERVISOR';
}
