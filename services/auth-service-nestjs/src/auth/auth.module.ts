import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RedisHandler } from '../redis/redis.handler';
import { URL } from 'url';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}), // Register JwtModule globally or configure as needed
    ClientsModule.register([
      {
        name: 'REDIS_CLIENT',
        transport: Transport.REDIS,
        options: (() => {
          const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
          const parsedUrl = new URL(redisUrl);
          return {
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port || '6379', 10),
            password: parsedUrl.password,
          };
        })(),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService,RedisHandler],
  exports: [AuthService],
})
export class AuthModule {}
