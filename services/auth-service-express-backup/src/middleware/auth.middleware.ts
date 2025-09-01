import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

export const authMiddleware = (db: Pool) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Access token required' 
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-secret-key'
      ) as { userId: number; email: string };

      // Optional: Verify user still exists in database
      const result = await db.query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        username: result.rows[0].username
      };

      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
  };
};