import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";
import { createServiceLogger } from "@aether/shared";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";

const logger = createServiceLogger("api-gateway");

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const wsProxy = createProxyMiddleware({
      target: `http://localhost:3001`,
      changeOrigin: true,
      ws: true,
      logger: logger, // Use logLevel instead of logger
      pathRewrite: {
        "^/socket": "/socket", // Ensure path is preserved
      },
      on: {
        proxyReqWs: (proxyReq, req, socket, options, head) => {
          logger.debug(`[HPM] WebSocket proxy request: ${req.url}`);
        },
        proxyRes: (proxyRes, req, res) => {
          logger.debug(
            `[HPM] WebSocket proxy response status: ${proxyRes.statusCode} for ${req.url}`
          );
        },
        error: (err, req, res) => {
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

    app.use(morgan("dev"));

    // Cookie parser middleware
    app.use(cookieParser());

    // Rate limiting
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
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
    const server = await app.listen(port);

    server.on("upgrade", (request, socket, head) => {
      logger.debug(`[HPM] Upgrade request for: ${request.url}`);

      if (request.url?.startsWith("/socket")) {
        try {
          wsProxy.upgrade(request, socket, head);
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
