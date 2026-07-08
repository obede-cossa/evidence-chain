import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from './jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser =>
    ctx.switchToHttp().getRequest().user,
);
