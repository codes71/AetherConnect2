import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageGrpcClient } from "@aether/shared";
import { createServiceLogger } from "@aether/shared";

const logger = createServiceLogger("message-service-gateway");

@Injectable()
export class MessageService implements OnModuleInit {
  private messageClient: MessageGrpcClient;

  onModuleInit() {
    const messageServiceUrl = process.env.MESSAGE_SERVICE_GRPC_URL;
    this.messageClient = new MessageGrpcClient(messageServiceUrl);
  }

  async getRooms(userId: string) {
    try {
      return await this.messageClient.GetRooms({ userId });
    } catch (error) {
      logger.error("GetRooms gRPC call failed:", error);
      return {
        success: false,
        message: "Failed to get rooms",
        error: "Internal server error",
      };
    }
  }

  async getMessageHistory(
    roomId: string,
    page: number,
    limit: number,
    userId: string
  ) {
    try {
      return await this.messageClient.GetMessageHistory({
        roomId,
        page,
        limit,
        userId,
      });
    } catch (error) {
      logger.error("GetMessageHistory gRPC call failed:", error);
      return {
        success: false,
        message: "Failed to get message history",
        error: "Internal server error",
      };
    }
  }
}
