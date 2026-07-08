import { IsString, IsUUID, MinLength } from 'class-validator';

export class TransferDto {
  @IsUUID()
  toUserId: string;

  @IsString()
  @MinLength(3)
  reason: string;
}
