import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";
import { createServiceLogger } from "@aether/shared";
import morgan from "morgan";
import cookieParser from 'cookie-parser';

const logger = createServiceLogger("api-gateway");

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Security middleware
    app.use(helmet());

    app.use(morgan("dev"));

    // Cookie parser middleware
    app.use(cookieParser());

    // Rate limiting
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10000, // limit each IP to 100 requests per windowMs
        message: "Too many requests from this IP, please try again later.",
      })
    );

    // CORS
    app.enableCors({
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3004",
        "http://192.168.1.6:3004", // Add this for local network access if needed
      ],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle("AetherConnect API")
      .setDescription("Enterprise-grade chat application API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    const port = process.env.API_GATEWAY_PORT;
    await app.listen(port);

    logger.info(`🚀 API Gateway is running on http://localhost:${port}`);
    logger.info(
      `📚 Swagger docs available at http://localhost:${port}/api/docs`
    );
    logger.info(`🔗 Health check: http://localhost:${port}/api/health`);
  } catch (error) {
    logger.error("Failed to start API Gateway:", error);
    process.exit(1);
  }
}

bootstrap();
