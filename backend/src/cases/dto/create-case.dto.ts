import { IsString, MinLength } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @MinLength(3)
  number: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  description: string;
}
