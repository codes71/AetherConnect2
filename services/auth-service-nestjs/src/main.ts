import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";
import { AppModule } from "./app.module";
import { createServiceLogger } from "@aether/shared";
import * as dotenv from "dotenv";

const logger = createServiceLogger("auth-service");

dotenv.config({ path:"../../.env"});
console.log("Environment Variables:", {
  POSTGRES_URL: process.env.POSTGRES_URL,
});
async function bootstrap() {
  try {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: "auth",
          protoPath: join(__dirname, "../../../packages/protos/auth.proto"),
          url: `0.0.0.0:${process.env.AUTH_SERVICE_GRPC_PORT || 50001}`,
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

    await app.listen();

    const port = process.env.AUTH_SERVICE_GRPC_PORT || 50001;
    logger.info(`🔐 Auth Service (gRPC) is listening on port ${port}`);
    logger.info(
      `📋 Proto path: ${join(__dirname, "../../../packages/protos/auth.proto")}`
    );

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully");
      await app.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start Auth Service:", error);
    process.exit(1);
  }
}

bootstrap();
