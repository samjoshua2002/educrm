import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enums/roles.enum.js';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // We assume params will have :orgId as the identifier in the route
    const { orgId } = request.params;

    // 1. If user is Superadmin, allow everything
    if (user.role === Role.SUPERADMIN) {
      return true;
    }

    // 2. If the route has an :orgId param, it MUST match the user's organizationId
    if (orgId && user.organizationId !== orgId) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to access this organization’s data',
      );
    }

    // 3. If there is no orgId in the route but the user is not a Superadmin,
    // they can only access their own profile (which they already can via /users/me).
    // Future checks for specific entities can be added here.
    
    return true;
  }
}
