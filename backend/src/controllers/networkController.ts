import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const deviceType = (req.query.deviceType as string) || '';
  const status = (req.query.status as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();
    let where = 'WHERE 1=1';

    if (search) {
      where += ' AND (hostname LIKE @search OR ip_address LIKE @search OR mac_address LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (deviceType) {
      where += ' AND device_type = @deviceType';
      countReq.input('deviceType', sql.NVarChar, deviceType);
      dataReq.input('deviceType', sql.NVarChar, deviceType);
    }
    if (status) {
      where += ' AND status = @status';
      countReq.input('status', sql.NVarChar, status);
      dataReq.input('status', sql.NVarChar, status);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM network_devices ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, hostname, ip_address as ipAddress, mac_address as macAddress,
        device_type as deviceType, manufacturer, model, location, vlan, subnet, status,
        last_seen as lastSeen, created_at as createdAt
      FROM network_devices ${where}
      ORDER BY hostname
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
        SUM(CASE WHEN status='Online' THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN status='Offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status='Warning' THEN 1 ELSE 0 END) as warning
      FROM network_devices
    `);
    res.json({ status: 'success', data: r.recordset[0], message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { hostname, ipAddress, macAddress, deviceType, manufacturer, model, location, vlan, subnet, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('hostname', sql.NVarChar, hostname).input('ipAddress', sql.NVarChar, ipAddress)
      .input('macAddress', sql.NVarChar, macAddress).input('deviceType', sql.NVarChar, deviceType)
      .input('manufacturer', sql.NVarChar, manufacturer).input('model', sql.NVarChar, model)
      .input('location', sql.NVarChar, location).input('vlan', sql.NVarChar, vlan)
      .input('subnet', sql.NVarChar, subnet).input('status', sql.NVarChar, status || 'Online')
      .query(`INSERT INTO network_devices (hostname,ip_address,mac_address,device_type,manufacturer,model,location,vlan,subnet,status,last_seen,created_at)
        VALUES (@hostname,@ipAddress,@macAddress,@deviceType,@manufacturer,@model,@location,@vlan,@subnet,@status,GETDATE(),GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Created' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const { hostname, ipAddress, macAddress, deviceType, manufacturer, model, location, vlan, subnet, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id))
      .input('hostname', sql.NVarChar, hostname).input('ipAddress', sql.NVarChar, ipAddress)
      .input('macAddress', sql.NVarChar, macAddress).input('deviceType', sql.NVarChar, deviceType)
      .input('manufacturer', sql.NVarChar, manufacturer).input('model', sql.NVarChar, model)
      .input('location', sql.NVarChar, location).input('vlan', sql.NVarChar, vlan)
      .input('subnet', sql.NVarChar, subnet).input('status', sql.NVarChar, status)
      .query('UPDATE network_devices SET hostname=@hostname,ip_address=@ipAddress,mac_address=@macAddress,device_type=@deviceType,manufacturer=@manufacturer,model=@model,location=@location,vlan=@vlan,subnet=@subnet,status=@status WHERE id=@id');
    res.json({ status: 'success', data: null, message: 'Updated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id)).query('DELETE FROM network_devices WHERE id = @id');
    res.json({ status: 'success', data: null, message: 'Deleted' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
