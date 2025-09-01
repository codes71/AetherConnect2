import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.middleware';

// Add this interface after imports
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

dotenv.config({path: '../../.env'});

const app = express();
app.use(express.json());
app.use(cors());

const db = new Pool({
  user: 'aether',
  host: 'localhost',
  database: 'aetherconnect',
  password: 'secret123',
  port: 5433,
});

const registerSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Enhanced registration route
app.post('/api/auth/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    // Generate tokens
    const accessToken = jwt.sign(
      { userId: null, email: data.email }, // userId will be set after insert
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { email: data.email, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '7d' }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Insert user
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, refresh_token_hash, refresh_token_expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, email, first_name, last_name`,
      [data.username, data.email, passwordHash, data.firstName, data.lastName, refreshTokenHash, refreshExpiresAt]
    );
    
    const user = result.rows[0];
    
    // Generate new access token with correct userId
    const finalAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      accessToken: finalAccessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
    } else {
        res.status(400).json({ success: false, error: 'An unknown error occurred' });
    }
  }
});

// Enhanced login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [data.email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '7d' }
    );

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE users SET refresh_token_hash = $1, refresh_token_expires_at = $2 WHERE id = $3',
      [refreshTokenHash, refreshExpiresAt, user.id]
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
    } else {
        res.status(400).json({ success: false, error: 'An unknown error occurred' });
    }
  }
});


// Get current user profile (protected route)
app.get('/api/auth/profile', authMiddleware(db), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const result = await db.query(
      'SELECT id, username, email, first_name, last_name, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update user profile (protected route)
app.put('/api/auth/profile', authMiddleware(db), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const updateSchema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      username: z.string().min(3).optional()
    });

    const data = updateSchema.parse(req.body);
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (data.firstName) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(data.firstName);
    }
    if (data.lastName) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(data.lastName);
    }
    if (data.username) {
      updates.push(`username = $${paramCount++}`);
      values.push(data.username);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(req.user.userId); // Add user ID for WHERE clause

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, first_name, last_name`,
      values
    );

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof Error) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(400).json({ success: false, error: 'An unknown error occurred' });
    }
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
    ) as { userId: number; email: string; type: string };

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, error: 'Invalid token type' });
    }

    // Find user and verify stored refresh token
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1 AND refresh_token_expires_at > NOW()',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found or refresh token expired' });
    }

    const user = result.rows[0];
    
    // Verify refresh token hash
    const isValidRefresh = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!isValidRefresh) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
});