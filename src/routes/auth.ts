import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const userResult = await pool.query(
      'SELECT id, email, password_hash, name, role FROM admin_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rowCount === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'hxssan_studio_super_secret_jwt_key_2026';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('[Auth Error]', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.get('/me', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, name, role, created_at FROM admin_users WHERE id = $1',
      [req.user?.id]
    );

    if (userResult.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: userResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve current user' });
  }
});

export default router;
