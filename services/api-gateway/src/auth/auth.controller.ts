import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CreateUserDto, LoginDto, UpdateUserDto } from "./dto/auth.dto";
import { createServiceLogger } from "@aether/shared";
import { setAuthCookie, clearAuthCookie } from "../utils/cookie.util";

const logger = createServiceLogger("auth-controller-gateway");
const accessTokenExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
const refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

@ApiTags("Authentication")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(createUserDto);

    if (!result.success) {
      throw new BadRequestException(result.message || "Registration failed");
    }

    if (result.accessToken && result.refreshToken) {
      setAuthCookie(res, "accessToken", result.accessToken, accessTokenExpiry); // 30 days
      setAuthCookie(
        res,
        "refreshToken",
        result.refreshToken,
        refreshTokenExpiry
      ); // 7 days

      // Remove tokens from response body
      delete result.accessToken;
      delete result.refreshToken;
    }
    return result;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login user" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(loginDto);
    logger.info(
      `Node ENV is: ${process.env.NODE_ENV}. Secure cookie set to: ${
        process.env.NODE_ENV === "production"
      }`
    );

    if (!result.success) {
      throw new UnauthorizedException(result.message || "Login failed");
    }

    if (result.accessToken && result.refreshToken) {
      setAuthCookie(res, "accessToken", result.accessToken, accessTokenExpiry); // 30 days
      setAuthCookie(
        res,
        "refreshToken",
        result.refreshToken,
        refreshTokenExpiry
      ); // 7 days

      // Remove tokens from response body
      delete result.accessToken;
      delete result.refreshToken;
    }
    return result;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies["refreshToken"]; // Read from HttpOnly cookie

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not found");
    }

    const result = await this.authService.refreshToken(refreshToken);

    if (!result.success) {
      throw new UnauthorizedException(result.message || "Token refresh failed");
    }

    if (result.accessToken && result.refreshToken) {
      setAuthCookie(res, "accessToken", result.accessToken, accessTokenExpiry); // 30 days
      setAuthCookie(
        res,
        "refreshToken",
        result.refreshToken,
        refreshTokenExpiry
      ); // 7 days
      delete result.accessToken; // Remove from response body
      delete result.refreshToken; // Remove new refresh token from response body
    }
    return result;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout user" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies["refreshToken"];
      // logger.info(`Logout: Refresh token from cookies: ${refreshToken}`);

      if (refreshToken) {
        // Invalidate refresh token in backend
        await this.authService.logout(refreshToken);
      }

      // Clear cookies
      clearAuthCookie(res, "accessToken");
      clearAuthCookie(res, "refreshToken");

      logger.info("User logged out, tokens invalidated");
      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      logger.error("Logout failed:", error);
      return { success: false, message: "Logout failed" };
    }
  }

  @Get("ws-token")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get WebSocket token" })
  @ApiResponse({
    status: 200,
    description: "WebSocket token retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getWsToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.getWebSocketToken(req.user.userId);

    if (result.success && result.token) {
      setAuthCookie(res, "wsToken", result.token, 60 * 1000); // 60 seconds
      // Do NOT remove token from response body, as per user's revised plan
    }
    return result;
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user profile" })
  @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getProfile(@Req() req: Request) {
    const result = await this.authService.getUserProfile(req.user.userId);
    return result;
  }

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const result = await this.authService.updateUserProfile(
      req.user.userId,
      updateUserDto
    );
    return result;
  }
}
