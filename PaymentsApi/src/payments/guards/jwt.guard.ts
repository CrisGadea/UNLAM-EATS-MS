import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeaders(request);

    this.logger.log(`=== AuthGuard - ${request.method} ${request.url} ===`);
    this.logger.log(
      `NODE_ENV: ${this.configService.get('NODE_ENV') || 'development'}`,
    );
    this.logger.log(`Token presente: ${!!token}`);

    if (
      (this.configService.get('NODE_ENV') || 'development') !== 'production'
    ) {
      this.logger.log('Modo desarrollo - Autenticación omitida');
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const user = await this.jwtService.verifyAsync<JwtPayload>(token);
      request['user'] = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeaders(request: Request): string | undefined {
    const [type, token] = request.headers['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
