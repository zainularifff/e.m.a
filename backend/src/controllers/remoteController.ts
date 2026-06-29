import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || '';
  const protocol = (req.query.protocol as string) || '';

  try {
    const pool = await getPool();
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (search) { where += ' AND (target_hostname LIKE @search OR target_ip LIKE @search OR initiated_by LIKE @search)'; request.input('search', sql.NVarChar, `%${search}%`); }
    if (status) { where += ' AND status = @status'; request.input('status', sql.NVarChar, status); }
    if (protocol) { where += ' AND protocol = @protocol'; request.input('protocol', sql.NVarChar, protocol); }

    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM remote_sessions ${where.replace(/@\w+/g, (m) => { const val = request.parameters[m.slice(1)]?.value; return val ? `'${String(val).replace(/'/g, "''")}'` : 'NULL'; })}`);
    request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await request.query(`
      SELECT id, target_hostname as targetHostname, target_ip as targetIp, initiated_by as initiatedBy,
        protocol, status, start_time as startTime, end_time as endTime, duration_seconds as duration,
        created_at as createdAt
      FROM remote_sessions ${where}
      ORDER BY start_time DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { targetHostname, targetIp, protocol } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('targetHostname', sql.NVarChar, targetHostname)
      .input('targetIp', sql.NVarChar, targetIp)
      .input('initiatedBy', sql.NVarChar, req.user?.username || 'system')
      .input('protocol', sql.NVarChar, protocol || 'RDP')
      .query(`INSERT INTO remote_sessions (target_hostname,target_ip,initiated_by,protocol,status,start_time,created_at)
        VALUES (@targetHostname,@targetIp,@initiatedBy,@protocol,'Active',GETDATE(),GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Session started' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const { status } = req.body;
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id))
      .input('status', sql.NVarChar, status)
      .query(`UPDATE remote_sessions SET status=@status, end_time=CASE WHEN @status IN ('Completed','Failed') THEN GETDATE() ELSE end_time END,
        duration_seconds=CASE WHEN @status IN ('Completed','Failed') THEN DATEDIFF(SECOND,start_time,GETDATE()) ELSE duration_seconds END WHERE id=@id`);
    res.json({ status: 'success', data: null, message: 'Updated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
