import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getAll(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, [key], value, description, category, updated_at as updatedAt FROM settings ORDER BY category, [key]');
    res.json({ status: 'success', data: result.recordset, message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const updates = req.body as Record<string, string>;
  try {
    const pool = await getPool();
    for (const [key, value] of Object.entries(updates)) {
      await pool.request()
        .input('key', sql.NVarChar, key)
        .input('value', sql.NVarChar, String(value))
        .query('UPDATE settings SET value = @value, updated_at = GETDATE() WHERE [key] = @key');
    }
    res.json({ status: 'success', data: null, message: 'Settings updated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
