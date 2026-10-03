import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class MembersOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.isGuest) {
      throw new ForbiddenException(
        'Guests can only look around. Create an account to join in.',
      );
    }
    return true;
  }
}
