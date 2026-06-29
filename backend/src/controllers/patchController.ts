import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const severity = (req.query.severity as string) || '';
  const status = (req.query.status as string) || '';
  const category = (req.query.category as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (patch_name LIKE @search OR kb_number LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (severity) {
      where += ' AND severity = @severity';
      countReq.input('severity', sql.NVarChar, severity);
      dataReq.input('severity', sql.NVarChar, severity);
    }
    if (status) {
      where += ' AND status = @status';
      countReq.input('status', sql.NVarChar, status);
      dataReq.input('status', sql.NVarChar, status);
    }
    if (category) {
      where += ' AND category = @category';
      countReq.input('category', sql.NVarChar, category);
      dataReq.input('category', sql.NVarChar, category);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM patch_records ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, patch_name as patchName, kb_number as kbNumber, severity, category,
        affected_assets as affectedAssets, patched_assets as patchedAssets, status,
        release_date as releaseDate, deployed_date as deployedDate, created_at as createdAt
      FROM patch_records ${where}
      ORDER BY release_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const [counts, bySeverity] = await Promise.all([
      pool.request().query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status='Failed' THEN 1 ELSE 0 END) as failed
        FROM patch_records
      `),
      pool.request().query('SELECT severity as name, COUNT(*) as count FROM patch_records GROUP BY severity'),
    ]);
    res.json({ status: 'success', data: { ...counts.recordset[0], bySeverity: bySeverity.recordset }, message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { patchName, kbNumber, severity, category, affectedAssets, patchedAssets, status, releaseDate } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('patchName', sql.NVarChar, patchName).input('kbNumber', sql.NVarChar, kbNumber)
      .input('severity', sql.NVarChar, severity).input('category', sql.NVarChar, category)
      .input('affectedAssets', sql.Int, affectedAssets || 0).input('patchedAssets', sql.Int, patchedAssets || 0)
      .input('status', sql.NVarChar, status || 'Pending').input('releaseDate', sql.DateTime, new Date(releaseDate))
      .query(`INSERT INTO patch_records (patch_name,kb_number,severity,category,affected_assets,patched_assets,status,release_date,created_at)
        VALUES (@patchName,@kbNumber,@severity,@category,@affectedAssets,@patchedAssets,@status,@releaseDate,GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Created' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const { patchName, kbNumber, severity, category, affectedAssets, patchedAssets, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id))
      .input('patchName', sql.NVarChar, patchName).input('kbNumber', sql.NVarChar, kbNumber)
      .input('severity', sql.NVarChar, severity).input('category', sql.NVarChar, category)
      .input('affectedAssets', sql.Int, affectedAssets).input('patchedAssets', sql.Int, patchedAssets)
      .input('status', sql.NVarChar, status)
      .query('UPDATE patch_records SET patch_name=@patchName,kb_number=@kbNumber,severity=@severity,category=@category,affected_assets=@affectedAssets,patched_assets=@patchedAssets,status=@status WHERE id=@id');
    res.json({ status: 'success', data: null, message: 'Updated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id)).query('DELETE FROM patch_records WHERE id = @id');
    res.json({ status: 'success', data: null, message: 'Deleted' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
