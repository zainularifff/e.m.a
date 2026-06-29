import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const category = (req.query.category as string) || '';
  const status = (req.query.status as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (name LIKE @search OR vendor LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (category) {
      where += ' AND category = @category';
      countReq.input('category', sql.NVarChar, category);
      dataReq.input('category', sql.NVarChar, category);
    }
    if (status) {
      where += ' AND status = @status';
      countReq.input('status', sql.NVarChar, status);
      dataReq.input('status', sql.NVarChar, status);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM software_inventory ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, name, vendor, version, license_type as licenseType, licenses_owned as licensesOwned,
        licenses_used as licensesUsed, install_count as installCount, category, status,
        last_detected as lastDetected, created_at as createdAt
      FROM software_inventory ${where}
      ORDER BY name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status='Licensed' THEN 1 ELSE 0 END) as licensed,
        SUM(CASE WHEN status='Unlicensed' THEN 1 ELSE 0 END) as unlicensed,
        SUM(install_count) as totalInstalls
      FROM software_inventory
    `);
    res.json({ status: 'success', data: r.recordset[0], message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { name, vendor, version, licenseType, licensesOwned, licensesUsed, installCount, category, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('name', sql.NVarChar, name).input('vendor', sql.NVarChar, vendor)
      .input('version', sql.NVarChar, version).input('licenseType', sql.NVarChar, licenseType)
      .input('licensesOwned', sql.Int, licensesOwned).input('licensesUsed', sql.Int, licensesUsed)
      .input('installCount', sql.Int, installCount).input('category', sql.NVarChar, category)
      .input('status', sql.NVarChar, status || 'Licensed')
      .query(`INSERT INTO software_inventory (name,vendor,version,license_type,licenses_owned,licenses_used,install_count,category,status,last_detected,created_at)
        VALUES (@name,@vendor,@version,@licenseType,@licensesOwned,@licensesUsed,@installCount,@category,@status,GETDATE(),GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Created' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const { name, vendor, version, licenseType, licensesOwned, licensesUsed, installCount, category, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('name', sql.NVarChar, name).input('vendor', sql.NVarChar, vendor)
      .input('version', sql.NVarChar, version).input('licenseType', sql.NVarChar, licenseType)
      .input('licensesOwned', sql.Int, licensesOwned).input('licensesUsed', sql.Int, licensesUsed)
      .input('installCount', sql.Int, installCount).input('category', sql.NVarChar, category)
      .input('status', sql.NVarChar, status)
      .query('UPDATE software_inventory SET name=@name,vendor=@vendor,version=@version,license_type=@licenseType,licenses_owned=@licensesOwned,licenses_used=@licensesUsed,install_count=@installCount,category=@category,status=@status WHERE id=@id');
    res.json({ status: 'success', data: null, message: 'Updated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id)).query('DELETE FROM software_inventory WHERE id = @id');
    res.json({ status: 'success', data: null, message: 'Deleted' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
