import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: (() => {
        const dbUrl = process.env.POSTGRES_URL  || 'postgresql://aether:aether_secret_2025@localhost:5433/aetherconnect';
        console.log(`Attempting to connect to database with URL: ${dbUrl}`);
        return dbUrl;
      })(),
      entities: [User],
      synchronize: process.env.NODE_ENV !== 'production', // Only for development!
      logging: process.env.NODE_ENV === 'development',
      ssl: false,
    }),
  ],
})
export class DatabaseModule {}