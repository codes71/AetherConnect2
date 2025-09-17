import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      username: string;
      // Add any other properties your user object might have
    };
  }
}