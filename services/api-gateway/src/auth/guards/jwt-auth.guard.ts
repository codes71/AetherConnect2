import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { createServiceLogger } from '@aether/shared';

const logger = createServiceLogger('jwt-auth-guard');

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No access token found in Authorization header');
      throw new UnauthorizedException('Access token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const result = await this.authService.validateToken(token);
      
      if (!result.success || !result.isValid) {
        logger.warn('Token validation failed');
        throw new UnauthorizedException('Invalid token');
      }

      request.user = {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
      };

      return true;
    } catch {
      logger.error('Token validation error');
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
