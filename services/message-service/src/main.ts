import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import path, { join } from "path";
import { AppModule } from "./app.module";
import { createServiceLogger } from "@aether/shared";
const logger = createServiceLogger("message-service");

async function bootstrap() {
  try {
    // Create gRPC microservice

    const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: "message",
          protoPath: join(__dirname, "../../../packages/protos/message.proto"),
          url: `0.0.0.0:${process.env.MESSAGE_SERVICE_GRPC_PORT || 50002}`,
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      }
    );

    // Create HTTP app for Socket.io
    const httpApp = await NestFactory.create(AppModule);

    // Enable CORS for Socket.io
    httpApp.enableCors({
      origin: process.env.FRONTEND_URL || "http://localhost:3004", // Use FRONTEND_URL for consistency
      credentials: true,
    });

    // Start both services
    const httpPort = process.env.MESSAGE_SERVICE_HTTP_PORT  // Default to 3001 if not set

    await Promise.all([grpcApp.listen(), httpApp.listen(httpPort)]);

    const grpcPort = process.env.MESSAGE_SERVICE_GRPC_PORT // Default to 50002 if not set

    logger.info(`💬 Message Service (gRPC) is listening on port ${grpcPort}`);
    logger.info(
      `🌐 Message Service (Socket.IO) is listening on port ${httpPort}`
    );

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully");
      await grpcApp.close();
      await httpApp.close(); // Ensure HTTP app is also closed
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start Message Service:", error);
    process.exit(1);
  }
}

bootstrap();
