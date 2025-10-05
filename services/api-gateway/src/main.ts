import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";
import { createServiceLogger } from "@aether/shared";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Socket } from "net";
import { createProxyMiddleware } from "http-proxy-middleware";

// Import custom types
import "./types/express";

const logger = createServiceLogger("api-gateway");

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const wsProxy = createProxyMiddleware({
      target: `http://localhost:3001`,
      changeOrigin: true,
      ws: true,
      logger: logger, // Use logLevel instead of logger
      pathRewrite: {
        "^/socket": "/socket", // Ensure path is preserved
      },
      on: {
        proxyReqWs: (proxyReq, req) => {
          logger.debug(`[HPM] WebSocket proxy request: ${req.url}`);
        },
        proxyRes: (proxyRes, req) => {
          logger.debug(
            `[HPM] WebSocket proxy response status: ${proxyRes.statusCode} for ${req.url}`
          );
        },
        error: (err, req) => {
          logger.error(
            `[HPM] WebSocket proxy error for ${req.url}: ${err.message}`
          );
        },
      },
    });

    // WebSocket Proxy to Message Service
    app.use("/socket", wsProxy);

    // Security middleware
    app.use(helmet());

    // Trust the proxy to get the correct IP for rate limiting
    app.set('trust proxy', 1);

    app.use(morgan("dev"));

    // Cookie parser middleware
    app.use(cookieParser());

    // Rate limiting
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV == 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs
        message: "Too many requests from this IP, please try again later.",
      })
    );

    // CORS
    if(process.env.NODE_ENV !== 'production') {
      logger.warn("CORS is wide open for development");
      app.enableCors({
        origin: true,
        credentials: true,
      });
    }
    else {
      // For Railway/production, allow multiple origins
      const allowedOrigins = [];

      if(process.env.FRONTEND_URL) {
        // Remove trailing slash if it exists, for robust matching
        const sanitizedUrl = process.env.FRONTEND_URL.replace( /\/$/, '' );
        allowedOrigins.push(sanitizedUrl);
      }

      // Allow Railway domains (common Railway URL patterns)
      if(process.env.RAILWAY_STATIC_URL) {
        allowedOrigins.push(process.env.RAILWAY_STATIC_URL);
      }

      // Allow common Railway domains
      allowedOrigins.push(/^https:\/\/.*\.up\.railway\.app$/);
      allowedOrigins.push(/^https:\/\/.*\.railway\.app$/);

      // If no specific origins configured, allow all for Railway deployment
      if(allowedOrigins.length === 0) {
        logger.warn("No CORS origins configured, allowing all origins for Railway deployment");
        app.enableCors({
          origin: true,
          credentials: true,
        });
      } else {
        logger.info(`Setting CORS for origins: ${allowedOrigins.join(', ')}`);
        app.enableCors({
          origin: allowedOrigins,
          credentials: true,
        });
      }
    }
   

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
    const server = await app.listen(port);

    server.on("upgrade", (request, socket, head) => {
      logger.debug(`[HPM] Upgrade request for: ${request.url}`);

      if (request.url?.startsWith("/socket")) {
        try {
          wsProxy.upgrade(request, socket as Socket, head);
        } catch (error) {
          logger.error("[HPM] Upgrade error:", error.message);
          socket.destroy();
        }
      } else {
        logger.warn(`[HPM] Rejecting upgrade for: ${request.url}`);
        socket.destroy();
      }
    });

    logger.info(`🚀 API Gateway is running on http://localhost:${port}`);
    logger.info(`Proxying /socket to Message Service at port 3001`);
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
