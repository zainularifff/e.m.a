import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAppMetering(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const category = (req.query.category as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (application_name LIKE @search OR publisher LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (category) {
      where += ' AND category = @category';
      countReq.input('category', sql.NVarChar, category);
      dataReq.input('category', sql.NVarChar, category);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM application_metering ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, application_name as applicationName, publisher, version, executable_name as executableName,
        total_installs as totalInstalls, active_users as activeUsers, usage_hours as usageHours,
        last_used as lastUsed, category, created_at as createdAt
      FROM application_metering ${where}
      ORDER BY usage_hours DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function getAppStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const [counts, topApps] = await Promise.all([
      pool.request().query('SELECT COUNT(*) as total, SUM(active_users) as totalUsers, SUM(usage_hours) as totalHours, AVG(CAST(usage_hours AS FLOAT)) as avgHours FROM application_metering'),
      pool.request().query('SELECT TOP 8 application_name as name, usage_hours as hours FROM application_metering ORDER BY usage_hours DESC'),
    ]);
    res.json({ status: 'success', data: { ...counts.recordset[0], topApps: topApps.recordset }, message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function getInternetMetering(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const department = (req.query.department as string) || '';
  const category = (req.query.category as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (username LIKE @search OR ip_address LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (department) {
      where += ' AND department = @department';
      countReq.input('department', sql.NVarChar, department);
      dataReq.input('department', sql.NVarChar, department);
    }
    if (category) {
      where += ' AND category = @category';
      countReq.input('category', sql.NVarChar, category);
      dataReq.input('category', sql.NVarChar, category);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM internet_metering ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, username, department, ip_address as ipAddress, download_mb as downloadMb,
        upload_mb as uploadMb, total_mb as totalMb, protocol, category, timestamp, created_at as createdAt
      FROM internet_metering ${where}
      ORDER BY timestamp DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function getInternetStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const [counts, trend] = await Promise.all([
      pool.request().query('SELECT COUNT(*) as total, SUM(download_mb) as totalDownload, SUM(upload_mb) as totalUpload, AVG(CAST(total_mb AS FLOAT)) as avgDaily FROM internet_metering'),
      pool.request().query(`SELECT TOP 14 CONVERT(VARCHAR(10), timestamp, 120) as day, SUM(download_mb) as download, SUM(upload_mb) as upload FROM internet_metering GROUP BY CONVERT(VARCHAR(10), timestamp, 120) ORDER BY day DESC`),
    ]);
    res.json({ status: 'success', data: { ...counts.recordset[0], trend: trend.recordset.reverse() }, message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
