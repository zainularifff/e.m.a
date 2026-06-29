import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ status: 'error', message: 'Username and password required' });
    return;
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT u.*, r.name as roleName FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.username = @username AND u.is_active = 1');

    if (result.recordset.length === 0) {
      res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      return;
    }
    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.roleName },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );
    res.json({
      status: 'success',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.roleName, menuIndex: user.menu_index },
      },
      message: 'Login successful',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user!.id)
      .query('SELECT u.id, u.username, u.email, r.name as role, u.menu_index as menuIndex FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = @id');
    if (result.recordset.length === 0) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    res.json({ status: 'success', data: result.recordset[0], message: '' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
}
