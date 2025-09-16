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
} from "@nestjs/common";
import { Request, Response } from "express";
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

const logger = createServiceLogger("auth-controller-gateway");

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

    if (result.success && result.accessToken && result.refreshToken) {
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Temporarily removed for debugging
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
      });
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Temporarily removed for debugging
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

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

    if (result.success && result.accessToken && result.refreshToken) {
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Temporarily removed for debugging
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
      });
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Temporarily removed for debugging
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

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
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
      });
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });
      delete result.accessToken; // Remove from response body
      delete result.refreshToken; // Remove new refresh token from response body
    }
    return result;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Logout user" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    try {
      // Invalidate refresh token in backend
      await this.authService.logout({ userId: req.user.userId });
      
      // Clear cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax",
        path: "/",
      });
      
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
      res.cookie("wsToken", result.token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production', // Temporarily removed for debugging
        sameSite: "lax",
        maxAge: 60 * 1000, // 60 seconds
        path: "/",
      });
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
