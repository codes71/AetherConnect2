import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import Redis from 'ioredis';
import { createServiceLogger } from '@aether/shared';
import { URL } from 'url';

const logger = createServiceLogger('redis-handler');

@Controller()
export class RedisHandler {
  private readonly redisClient?: Redis;
  private readonly isRedisEnabled: boolean;

  constructor() {
    this.isRedisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (this.isRedisEnabled) {
      try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const parsedUrl = new URL(redisUrl);
        this.redisClient = new Redis({
          host: parsedUrl.hostname,
          port: parseInt(parsedUrl.port || '6379', 10),
          password: parsedUrl.password,
          family: 4, // Use IPv4
        });

        this.redisClient.on('connect', () => logger.info('Redis client connected'));
        this.redisClient.on('error', (err) => logger.warn('Redis client error (blacklisting disabled):', err));
        this.redisClient.on('close', () => logger.warn('Redis connection closed'));

      } catch (error) {
        logger.warn('Failed to initialize Redis client (blacklisting disabled):', error);
        this.redisClient = undefined;
      }
    } else {
      logger.info('Redis blacklisting disabled via REDIS_ENABLED=false');
    }
  }

  @MessagePattern('set_blacklisted_token')
  async setBlacklistedToken(@Payload() data: { token: string; ttl: number }) {
    if (!this.redisClient) {
      logger.debug('Redis not available, skipping token blacklisting');
      return true; // Succeed silently if Redis is unavailable
    }

    try {
      const { token, ttl } = data;
      logger.info(`Blacklisting token: ${token} for ${ttl} seconds`);
      await this.redisClient.setex(`blacklist:${token}`, ttl, 'true');
      return true;
    } catch (error) {
      logger.warn('Failed to blacklist token (proceeding anyway):', error);
      return true; // Don't fail the logout operation if Redis is down
    }
  }

  @MessagePattern('get_blacklisted_token')
  async getBlacklistedToken(@Payload() token: string) {
    if (!this.redisClient) {
      logger.debug('Redis not available, allowing token');
      return false; // If Redis is unavailable, allow all tokens (fail open)
    }

    try {
      const isBlacklisted = await this.redisClient.get(`blacklist:${token}`);
      logger.debug(`Checking blacklist for token: ${token}, Result: ${!!isBlacklisted}`);
      return !!isBlacklisted;
    } catch (error) {
      logger.warn('Error checking blacklisted token (allowing token):', error);
      return false; // If Redis is down, allow token validation to proceed (fail open)
    }
  }
}
