import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthGrpcClient } from '@aether/shared';
import { CreateUserDto, LoginDto, UpdateUserDto } from './dto/auth.dto';
import { createServiceLogger } from '@aether/shared';

const logger = createServiceLogger('auth-service-gateway');

@Injectable()
export class AuthService implements OnModuleInit {
  private authClient: AuthGrpcClient;

  onModuleInit() {
    const authServiceUrl = process.env.AUTH_SERVICE_GRPC_URL
    this.authClient = new AuthGrpcClient(authServiceUrl);
  }

  async register(createUserDto: CreateUserDto) {
    try {
      return await this.authClient.CreateUser(createUserDto);
    } catch (error) {
      logger.error('Register gRPC call failed:', error);
      return {
        success: false,
        message: 'Registration failed',
        error: 'Internal server error',
      };
    }
  }

  async login(loginDto: LoginDto) {
    try {
      return await this.authClient.Login(loginDto);
    } catch (error) {
      logger.error('Login gRPC call failed:', error);
      return {
        success: false,
        message: 'Login failed',
        error: 'Internal server error',
      };
    }
  }

  async validateToken(token: string) {
    try {
      return await this.authClient.ValidateToken({ token });
    } catch (error) {
      logger.error('ValidateToken gRPC call failed:', error);
      return {
        success: false,
        message: 'Token validation failed',
        isValid: false,
      };
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      return await this.authClient.RefreshToken({ refreshToken });
    } catch (error) {
      logger.error('RefreshToken gRPC call failed:', error);
      return {
        success: false,
        message: 'Token refresh failed',
        error: 'Internal server error',
      };
    }
  }

  async logout(data: { userId: string }) {
    try {
      return await this.authClient.Logout(data);
    } catch (error) {
      logger.error('Logout gRPC call failed:', error);
      return {
        success: false,
        message: 'Logout failed',
        error: 'Internal server error',
      };
    }
  }

  async getUserProfile(userId: string) {
    try {
      return await this.authClient.GetUserProfile({ userId });
    } catch (error) {
      logger.error('GetUserProfile gRPC call failed:', error);
      return {
        success: false,
        message: 'Failed to get user profile',
        error: 'Internal server error',
      };
    }
  }

  async updateUserProfile(userId: string, updateUserDto: UpdateUserDto) {
    try {
      return await this.authClient.UpdateUserProfile({
        userId,
        ...updateUserDto,
      });
    } catch (error) {
      logger.error('UpdateUserProfile gRPC call failed:', error);
      return {
        success: false,
        message: 'Failed to update user profile',
        error: 'Internal server error',
      };
    }
  }

  async getWebSocketToken(userId: string) {
    try {
      return await this.authClient.GetWebSocketToken({ userId: parseInt(userId) });
    } catch (error) {
      logger.error('GetWebSocketToken gRPC call failed:', error);
      return {
        success: false,
        message: 'Failed to get WebSocket token',
        error: 'Internal server error',
      };
    }
  }
}