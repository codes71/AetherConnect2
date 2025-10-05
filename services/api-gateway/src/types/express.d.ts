import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email?: string;
        // Add any other properties your user object might have
      };
      cookies: {
        [key: string]: string;
      };
    }
  }
}

export {};
