import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const severity = (req.query.severity as string) || '';
  const eventType = (req.query.eventType as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (source LIKE @search OR message LIKE @search OR username LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (severity) {
      where += ' AND severity = @severity';
      countReq.input('severity', sql.NVarChar, severity);
      dataReq.input('severity', sql.NVarChar, severity);
    }
    if (eventType) {
      where += ' AND event_type = @eventType';
      countReq.input('eventType', sql.NVarChar, eventType);
      dataReq.input('eventType', sql.NVarChar, eventType);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM event_logs ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, event_type as eventType, severity, source, message, username,
        ip_address as ipAddress, timestamp, created_at as createdAt
      FROM event_logs ${where}
      ORDER BY timestamp DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { eventType, severity, source, message, ipAddress } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('eventType', sql.NVarChar, eventType || 'System')
      .input('severity', sql.NVarChar, severity || 'Info')
      .input('source', sql.NVarChar, source || 'API')
      .input('message', sql.NVarChar, message)
      .input('username', sql.NVarChar, req.user?.username || 'system')
      .input('ipAddress', sql.NVarChar, ipAddress || req.ip || '0.0.0.0')
      .query(`INSERT INTO event_logs (event_type,severity,source,message,username,ip_address,timestamp,created_at)
        VALUES (@eventType,@severity,@source,@message,@username,@ipAddress,GETDATE(),GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Logged' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
