import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import { createServiceLogger } from "@aether/shared";

const logger = createServiceLogger("auth-controller");

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod("AuthService", "CreateUser")
  async createUser(data: any) {
    try {
      logger.info("CreateUser gRPC call received", {
        email: data.email,
        username: data.username,
      });
      const result = await this.authService.createUser(data);
      logger.info("CreateUser completed successfully", {
        userId: result.user?.id,
      });
      return result;
    } catch (error) {
      logger.error("CreateUser failed:", error);
      return {
        success: false,
        message: "User creation failed",
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "Login")
  async login(data: any) {
    try {
      logger.info("Login gRPC call received", { email: data.email });
      const result = await this.authService.login(data);
      logger.info("Login completed", {
        success: result.success,
        userId: result.user?.id,
      });
      return result;
    } catch (error) {
      logger.error("Login failed:", error);
      return {
        success: false,
        message: "Login failed",
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "ValidateToken")
  async validateToken(data: any) {
    try {
      logger.debug("ValidateToken gRPC call received");
      const result = await this.authService.validateToken(data.token);
      logger.debug("ValidateToken completed", { isValid: result.isValid });
      return result;
    } catch (error) {
      logger.error("ValidateToken failed:", error);
      return {
        success: false,
        message: "Token validation failed",
        isValid: false,
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "RefreshToken")
  async refreshToken(data: any) {
    try {
      logger.info("RefreshToken gRPC call received");
      const result = await this.authService.refreshToken(data.refreshToken);
      logger.info("RefreshToken completed", { success: result.success });
      return result;
    } catch (error) {
      logger.error("RefreshToken failed:", error);
      return {
        success: false,
        message: "Token refresh failed",
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "GetUserProfile")
  async getUserProfile(data: any) {
    try {
      logger.info("GetUserProfile gRPC call received", { userId: data.userId });
      const result = await this.authService.getUserProfile(data.userId);
      logger.info("GetUserProfile completed", { success: result.success });
      return result;
    } catch (error) {
      logger.error("GetUserProfile failed:", error);
      return {
        success: false,
        message: "Failed to get user profile",
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "UpdateUserProfile")
  async updateUserProfile(data: any) {
    try {
      logger.info("UpdateUserProfile gRPC call received", {
        userId: data.userId,
      });
      const result = await this.authService.updateUserProfile(data);
      logger.info("UpdateUserProfile completed", { success: result.success });
      return result;
    } catch (error) {
      logger.error("UpdateUserProfile failed:", error);
      return {
        success: false,
        message: "Failed to update user profile",
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "Logout")
  async logout(data: any) {
    try {
      logger.info("Logout gRPC call received", { userId: data.userId });
      const result = await this.authService.logout(data.userId);
      logger.info("Logout completed", { success: result.success });
      return result;
    } catch (error) {
      logger.error("Logout failed:", error);
      return {
        success: false,
        message: "Logout failed",
        error: error.message,
      };
    }
  }

  @GrpcMethod("AuthService", "HealthCheck")
  async healthCheck() {
    return {
      success: true,
      message: "Auth Service is healthy",
      service: "auth-service",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }

  @GrpcMethod("AuthService", "GetWebSocketToken")
  async getWebSocketToken(data: { userId: string }) {
    try {
      const userId = parseInt(data.userId);
      logger.info("GetWebSocketToken gRPC call received", {
        userId: userId,
      });
      const wsToken = await this.authService.generateWebSocketToken(
        userId
      );
      logger.info("GetWebSocketToken completed", { success: !!wsToken });
      return { success: !!wsToken, token: wsToken };
    } catch (error) {
      logger.error("GetWebSocketToken failed:", error);
      return {
        success: false,
        message: "Failed to generate WebSocket token",
        error: error.message,
      };
    }
  }
}
