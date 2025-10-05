import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";
import { AppModule } from "./app.module";
import { createServiceLogger } from "@aether/shared";

const logger = createServiceLogger("auth-service");


async function bootstrap() {
  try {
    // Create gRPC microservice
    const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: "auth",
          protoPath: join(__dirname, "../../../packages/protos/auth.proto"),
          url: `0.0.0.0:${process.env.AUTH_SERVICE_GRPC_PORT}`,
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

    // Create HTTP app for health endpoints
    const httpApp = await NestFactory.create(AppModule);
    const httpPort = process.env.AUTH_SERVICE_HTTP_PORT || 3002;

    // Start both services
    await Promise.all([
      grpcApp.listen(),
      httpApp.listen(httpPort)
    ]);

    const grpcPort = process.env.AUTH_SERVICE_GRPC_PORT;
    logger.info(`🔐 Auth Service (gRPC) is listening on port ${grpcPort}`);
    logger.info(`🌐 Auth Service (HTTP) is listening on port ${httpPort}`);

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully");
      await grpcApp.close();
      await httpApp.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start Auth Service:", error);
    process.exit(1);
  }
}

bootstrap();
