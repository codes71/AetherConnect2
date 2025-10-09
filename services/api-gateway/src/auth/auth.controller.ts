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
  async register(@Body() createUserDto: CreateUserDto) {
    const result = await this.authService.register(createUserDto);

    if (!result.success) {
      throw new BadRequestException(result.message || "Registration failed");
    }

    return result;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login user" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);

    if (!result.success) {
      throw new UnauthorizedException(result.message || "Login failed");
    }

    return result;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout user" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      throw new UnauthorizedException('Access token not found');
    }
    await this.authService.logout(accessToken);
    return { success: true, message: "Logged out successfully" };
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
  async getWsToken(@Req() req: Request) {
    const result = await this.authService.getWebSocketToken(req.user.userId);
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
