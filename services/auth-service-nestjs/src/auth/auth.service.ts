import { Injectable, Inject } from "@nestjs/common";
import { TokenExpiredError, JsonWebTokenError } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { User } from "../users/entities/user.entity";
import { createServiceLogger } from "@aether/shared";
import { ClientProxy } from "@nestjs/microservices";

const logger = createServiceLogger("auth-service");

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redisClient: ClientProxy
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
          message: "User with this email or username already exists",
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
        roles: data.roles || ["user"],
      });

      const savedUser = await this.userRepository.save(user);

      // Generate tokens
      const { accessToken } = await this.generateTokens(savedUser);

      return {
        success: true,
        message: "User created successfully",
        user: this.formatUserData(savedUser),
        accessToken,
      };
    } catch (error) {
      logger.error("User creation failed:", error);
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
          message: "Invalid credentials",
        };
      }

      const isPasswordValid = await bcrypt.compare(
        data.password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid credentials",
        };
      }

      // Generate tokens
      const { accessToken } = await this.generateTokens(user);

      return {
        success: true,
        message: "Login successful",
        user: this.formatUserData(user),
        accessToken,
      };
    } catch (error) {
      logger.error("Login failed:", error);
      throw error;
    }
  }

  async validateToken(token: string) {
    try {
      let usedSecret: string;

      // Check if token is blacklisted (only if Redis is enabled)
      if (process.env.REDIS_ENABLED === 'true') {
        try {
          const isBlacklisted = await this.redisClient.send('get_blacklisted_token', token).toPromise();
          if (isBlacklisted) {
            logger.warn("Attempted to use a blacklisted token.");
            return {
              success: false,
              message: "Token is blacklisted",
              isValid: false,
            };
          }
        } catch (redisError) {
          logger.warn("Redis not available for blacklist check, skipping:", redisError.message);
        }
      }

      // Determine token type and use appropriate secret
      let decoded: any;

      // First try to validate as regular access token
      try {
        usedSecret = process.env.JWT_SECRET;
        logger.debug("Attempting to verify token with JWT_SECRET (access token)");
        decoded = this.jwtService.verify(token, {
          secret: usedSecret,
        });
      } catch (accessError) {
        logger.debug("Token not a valid access token, trying WS token");
        // Try as WS token
        try {
          usedSecret = process.env.JWT_WS_SECRET || "your-ws-secret-key";
          logger.debug("Attempting to verify token with JWT_WS_SECRET (WS token)");
          decoded = this.jwtService.verify(token, {
            secret: usedSecret,
          });
        } catch (error) {
          logger.error("Token verification failed for both access and WS tokens:", error);
          return {
            success: false,
            message: "Invalid token",
            isValid: false,
          };
        }
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
      });

      logger.debug("User lookup result:", {
        userId: decoded.userId,
        found: !!user,
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
          isValid: false,
        };
      }

      return {
        success: true,
        message: "Token is valid",
        isValid: true,
        user: this.formatUserData(user),
      };
    } catch (error) {
      logger.error("Token validation process failed:", error);
      return {
        success: false,
        message: "Invalid token",
        isValid: false,
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
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "User profile retrieved successfully",
        user: this.formatUserData(user),
      };
    } catch (error) {
      logger.error("Get user profile failed:", error);
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
          message: "User not found",
        };
      }

      // Update fields if provided
      if (data.firstName) user.firstName = data.firstName;
      if (data.lastName) user.lastName = data.lastName;
      if (data.username) user.username = data.username;

      const updatedUser = await this.userRepository.save(user);

      return {
        success: true,
        message: "User profile updated successfully",
        user: this.formatUserData(updatedUser),
      };
    } catch (error) {
      logger.error("Update user profile failed:", error);
      throw error;
    }
  }

  async logout(accessToken: string) {
    try {
      // Only blacklist token if Redis is enabled
      if (process.env.REDIS_ENABLED === 'true') {
        const decoded = this.jwtService.decode(accessToken);
        if (decoded && typeof decoded === 'object' && decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000); // Remaining time in seconds
          if (ttl > 0) {
            try {
              await this.redisClient.send('set_blacklisted_token', { token: accessToken, ttl }).toPromise();
              logger.info(`Access token blacklisted for ${ttl} seconds.`);
            } catch (redisError) {
              logger.warn("Redis not available for token blacklisting, logout still successful:", redisError.message);
            }
          }
        }
      }
      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      logger.error("Logout failed:", error);
      return {
        success: false,
        message: "Logout failed",
      };
    }
  }

  private async generateTokens(user: User) {
    const payload = { userId: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: "30d", // 30 days expiry as per new requirement
    });

    return { accessToken };
  }

  private formatUserData(user: User) {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(), // Add this line
      roles: user.roles,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async generateWebSocketToken(userId: number) {
    const payload = { userId: userId, type: "ws" };
    const wsToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_WS_SECRET || "your-ws-secret-key", // Use a distinct secret
      expiresIn: "60s", // Very short-lived
    });
    return wsToken;
  }
}
