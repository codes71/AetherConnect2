// services/api-gateway/src/types/express.d.ts
import { Request } from 'express';

interface User {
  userId: string;
  email: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
