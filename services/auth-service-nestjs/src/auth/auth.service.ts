import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { createServiceLogger } from '@aether/shared';

const logger = createServiceLogger('auth-service');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async createUser(data: any) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: [{ email: data.email }, { username: data.username }],
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email or username already exists',
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user
      const user = this.userRepository.create({
        username: data.username,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles || ['user'],
      });

      const savedUser = await this.userRepository.save(user);

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(savedUser);

      // Save refresh token
      await this.saveRefreshToken(savedUser.id, refreshToken);

      return {
        success: true,
        message: 'User created successfully',
        user: this.formatUserData(savedUser),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('User creation failed:', error);
      throw error;
    }
  }

  async login(data: any) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: data.email },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Save refresh token
      await this.saveRefreshToken(user.id, refreshToken);

      return {
        success: true,
        message: 'Login successful',
        user: this.formatUserData(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          isValid: false,
        };
      }

      return {
        success: true,
        message: 'Token is valid',
        isValid: true,
        user: this.formatUserData(user),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid token',
        isValid: false,
      };
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      });

      const user = await this.userRepository.findOne({
        where: { 
          id: decoded.userId,
        },
      });

      if (!user || !user.refreshTokenHash || user.refreshTokenExpiresAt < new Date()) {
        return {
          success: false,
          message: 'Invalid refresh token',
        };
      }

      const isValidRefresh = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isValidRefresh) {
        return {
          success: false,
          message: 'Invalid refresh token',
        };
      }

      // Generate new access token
      const accessToken = this.jwtService.sign(
        { userId: user.id, email: user.email },
        { 
          secret: process.env.JWT_SECRET || 'your-secret-key',
          expiresIn: '15m' 
        }
      );

      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Token refresh failed',
      };
    }
  }

  async getUserProfile(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        message: 'User profile retrieved successfully',
        user: this.formatUserData(user),
      };
    } catch (error) {
      logger.error('Get user profile failed:', error);
      throw error;
    }
  }

  async updateUserProfile(data: any) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: parseInt(data.userId) },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Update fields if provided
      if (data.firstName) user.firstName = data.firstName;
      if (data.lastName) user.lastName = data.lastName;
      if (data.username) user.username = data.username;

      const updatedUser = await this.userRepository.save(user);

      return {
        success: true,
        message: 'User profile updated successfully',
        user: this.formatUserData(updatedUser),
      };
    } catch (error) {
      logger.error('Update user profile failed:', error);
      throw error;
    }
  }

  private async generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        expiresIn: '7d',
      }
    );

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: number, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.userRepository.update(userId, {
      refreshTokenHash,
      refreshTokenExpiresAt,
    });
  }

  private formatUserData(user: User) {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}