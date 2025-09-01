import { Controller, Post, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto, LoginDto, UpdateUserDto } from './dto/auth.dto';
import { createServiceLogger } from '@aether/shared';

const logger = createServiceLogger('auth-controller-gateway');

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async register(@Body() createUserDto: CreateUserDto) {
    logger.info('Register request received', { email: createUserDto.email });
    const result = await this.authService.register(createUserDto);
    logger.info('Register request completed', { success: result.success });
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    logger.info('Login request received', { email: loginDto.email });
    const result = await this.authService.login(loginDto);
    logger.info('Login request completed', { success: result.success });
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() body: { refreshToken: string }) {
    logger.info('Refresh token request received');
    const result = await this.authService.refreshToken(body.refreshToken);
    logger.info('Refresh token request completed', { success: result.success });
    return result;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    logger.info('Get profile request received', { userId: req.user.userId });
    const result = await this.authService.getUserProfile(req.user.userId);
    logger.info('Get profile request completed', { success: result.success });
    return result;
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    logger.info('Update profile request received', { userId: req.user.userId });
    const result = await this.authService.updateUserProfile(req.user.userId, updateUserDto);
    logger.info('Update profile request completed', { success: result.success });
    return result;
  }
}