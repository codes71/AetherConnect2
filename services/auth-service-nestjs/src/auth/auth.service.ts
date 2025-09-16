import { Injectable } from "@nestjs/common";
import { TokenExpiredError, JsonWebTokenError } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { User } from "../users/entities/user.entity";
import { createServiceLogger } from "@aether/shared";

const logger = createServiceLogger("auth-service");

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
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
      const { accessToken, refreshToken } = await this.generateTokens(
        savedUser
      );

      // Save refresh token
      await this.saveRefreshToken(savedUser.id, refreshToken);

      return {
        success: true,
        message: "User created successfully",
        user: this.formatUserData(savedUser),
        accessToken,
        refreshToken,
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
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Save refresh token
      await this.saveRefreshToken(user.id, refreshToken);

      return {
        success: true,
        message: "Login successful",
        user: this.formatUserData(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error("Login failed:", error);
      throw error;
    }
  }

  async validateToken(token: string) {
    try {
      let decoded: any;
      let usedSecret: string;

      try {
        usedSecret = process.env.JWT_SECRET;
        logger.debug("Attempting to verify token with JWT_SECRET");
        decoded = this.jwtService.verify(token, {
          secret: usedSecret,
        });
      } catch (error) {
        logger.debug(
          "Verification with JWT_SECRET failed, attempting with JWT_WS_SECRET"
        );
        // If initial verification fails, try with WS secret if it's a WS token
        try {
          usedSecret = process.env.JWT_WS_SECRET;
          decoded = this.jwtService.verify(token, {
            secret: usedSecret,
          });
          if (decoded.type !== "ws") {
            logger.warn(
              "Token verified with JWT_WS_SECRET but type is not 'ws'"
            );
            throw new Error("Not a WebSocket token");
          }
          logger.debug("Token successfully verified with JWT_WS_SECRET");
        } catch (wsError) {
          logger.error("Verification with JWT_WS_SECRET");
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

  async refreshToken(refreshToken: string) {
    logger.info("--- Starting Token Refresh (Rotation) ---");
    logger.info(`Incoming token: ${refreshToken}`);
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      logger.info("Token verification successful", { decoded });

      const user = await this.userRepository.findOne({
        where: {
          id: decoded.userId,
        },
      });
      logger.info(`User lookup result for userId ${decoded.userId}:`, {
        user: user ? "Found" : "Not Found",
      });

      if (
        !user ||
        !user.refreshTokenHash ||
        user.refreshTokenExpiresAt < new Date()
      ) {
        logger.warn("Refresh token check failed", {
          userExists: !!user,
          hasHash: !!user?.refreshTokenHash,
          isExpired: user?.refreshTokenExpiresAt < new Date(),
        });
        return {
          success: false,
          message: "Invalid or expired refresh token",
        };
      }

      // Check if this exact token was already used by comparing issued time
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      const lastTokenIssuedAt = user.lastRefreshTokenIssuedAt || new Date(0);

      if (tokenIssuedAt <= lastTokenIssuedAt) {
        logger.warn("Token replay attack detected - token already used");
        return {
          success: false,
          message: "Token already used or invalid",
        };
      }

      const isValidRefresh = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash
      );
      logger.info(`bcrypt comparison result: ${isValidRefresh}`);

      if (!isValidRefresh) {
        logger.warn("Token hash mismatch - invalid token");
        return {
          success: false,
          message: "Invalid refresh token",
        };
      }

      // --- START: Refresh Token Rotation Logic (Atomic Transaction) ---
      logger.info(
        "Old refresh token validated. Generating new tokens and rotating atomically."
      );

      // Generate new access token AND new refresh token first
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user);
      logger.info("New access and refresh tokens generated.");

      // Hash the new refresh token
      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
      const newRefreshTokenExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ); // 7 days

      // Perform invalidation and saving in a single transaction
      const queryRunner =
        this.userRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Invalidate the old refresh token
        await queryRunner.manager.update(User, user.id, {
          refreshTokenHash: null, // Clear the hash
          refreshTokenExpiresAt: new Date(0), // Set to a past date
        });
        logger.info("Old refresh token invalidated in DB within transaction.");

        // Save the new refresh token and track issued time
        await queryRunner.manager.update(User, user.id, {
          refreshTokenHash: newRefreshTokenHash,
          refreshTokenExpiresAt: newRefreshTokenExpiresAt,
          lastRefreshTokenIssuedAt: new Date(decoded.iat * 1000),
        });
        logger.info("New refresh token saved to DB within transaction.");

        await queryRunner.commitTransaction();
        logger.info("Transaction committed successfully.");
      } catch (err) {
        await queryRunner.rollbackTransaction();
        logger.error("Transaction rolled back due to error:", err);
        throw err; // Re-throw the error after rollback
      } finally {
        await queryRunner.release();
      }

      // --- END: Refresh Token Rotation Logic (Atomic Transaction) ---

      logger.info("--- Token Refresh (Rotation) Successful ---");
      return {
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken, // Return the new access token
        refreshToken: newRefreshToken, // Return the new refresh token
      };
    } catch (error) {
      logger.error("Token refresh failed during try-catch:", {
        error: error.name,
        message: error.message,
      });
      if (error instanceof TokenExpiredError) {
        return {
          success: false,
          message: "Refresh token has expired",
        };
      } else if (error instanceof JsonWebTokenError) {
        return {
          success: false,
          message: "Invalid refresh token signature",
        };
      }
      return {
        success: false,
        message: "An unexpected error occurred during token refresh",
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

  async logout(userId: number) {
    try {
      await this.userRepository.update(userId, {
        refreshTokenHash: null,
        refreshTokenExpiresAt: new Date(0),
        lastRefreshTokenIssuedAt: new Date(0),
      });

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
      expiresIn: "15m",
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: "refresh" },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: "7d",
      }
    );

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: number, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ); // 7 days

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
