import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: "aws-1-us-east-2.pooler.supabase.com",
      port: 6543,
      username: "postgres.thijnzgwuwkpkdddctdm",
      password: process.env.POSTGRES_PASSWORD,
      database: "postgres",
      connectTimeoutMS: 10000,
      extra: {
        ssl: { rejectUnauthorized: false }
      },
      entities: [User],
      synchronize: true, // Set to false in production and use migrations
      logging: false,
    }),
  ],
})
export class DatabaseModule {}
