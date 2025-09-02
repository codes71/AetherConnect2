import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';

dotenv.config({path: '../../.env'});
@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URL,
      {
        authSource: 'admin',
      }
    ),
  ],
  providers: [],
})
export class DatabaseModule {}
