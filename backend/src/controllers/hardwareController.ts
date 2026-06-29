import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const department = (req.query.department as string) || '';
  const status = (req.query.status as string) || '';
  const os = (req.query.os as string) || '';

  try {
    const pool = await getPool();
    const countReq = pool.request();
    const dataReq = pool.request();

    let where = 'WHERE 1=1';
    if (search) {
      where += ' AND (hostname LIKE @search OR asset_tag LIKE @search OR assigned_to LIKE @search OR ip_address LIKE @search)';
      countReq.input('search', sql.NVarChar, `%${search}%`);
      dataReq.input('search', sql.NVarChar, `%${search}%`);
    }
    if (department) {
      where += ' AND department = @department';
      countReq.input('department', sql.NVarChar, department);
      dataReq.input('department', sql.NVarChar, department);
    }
    if (status) {
      where += ' AND status = @status';
      countReq.input('status', sql.NVarChar, status);
      dataReq.input('status', sql.NVarChar, status);
    }
    if (os) {
      where += ' AND os = @os';
      countReq.input('os', sql.NVarChar, os);
      dataReq.input('os', sql.NVarChar, os);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM hardware_assets ${where}`);
    dataReq.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    const result = await dataReq.query(`
      SELECT id, asset_tag as assetTag, hostname, manufacturer, model, serial_number as serialNumber,
        os, os_version as osVersion, cpu, ram_gb as ramGb, storage_gb as storageGb,
        department, assigned_to as assignedTo, ip_address as ipAddress, mac_address as macAddress,
        status, last_seen as lastSeen, created_at as createdAt
      FROM hardware_assets ${where}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({ status: 'success', data: buildResponse(result.recordset, countResult.recordset[0].total, page, limit), message: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) as active,
        AVG(CAST(ram_gb AS FLOAT)) as avgRam,
        AVG(CAST(storage_gb AS FLOAT)) as avgStorage
      FROM hardware_assets
    `);
    res.json({ status: 'success', data: r.recordset[0], message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function getById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, parseInt(req.params.id))
      .query('SELECT * FROM hardware_assets WHERE id = @id');
    if (!result.recordset.length) { res.status(404).json({ status: 'error', message: 'Not found' }); return; }
    res.json({ status: 'success', data: result.recordset[0], message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { assetTag, hostname, manufacturer, model, serialNumber, os, osVersion, cpu, ramGb, storageGb, department, assignedTo, ipAddress, macAddress, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('assetTag', sql.NVarChar, assetTag).input('hostname', sql.NVarChar, hostname)
      .input('manufacturer', sql.NVarChar, manufacturer).input('model', sql.NVarChar, model)
      .input('serialNumber', sql.NVarChar, serialNumber).input('os', sql.NVarChar, os)
      .input('osVersion', sql.NVarChar, osVersion).input('cpu', sql.NVarChar, cpu)
      .input('ramGb', sql.Int, ramGb).input('storageGb', sql.Int, storageGb)
      .input('department', sql.NVarChar, department).input('assignedTo', sql.NVarChar, assignedTo)
      .input('ipAddress', sql.NVarChar, ipAddress).input('macAddress', sql.NVarChar, macAddress)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`INSERT INTO hardware_assets (asset_tag,hostname,manufacturer,model,serial_number,os,os_version,cpu,ram_gb,storage_gb,department,assigned_to,ip_address,mac_address,status,last_seen,created_at)
        VALUES (@assetTag,@hostname,@manufacturer,@model,@serialNumber,@os,@osVersion,@cpu,@ramGb,@storageGb,@department,@assignedTo,@ipAddress,@macAddress,@status,GETDATE(),GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Created' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const { assetTag, hostname, manufacturer, model, serialNumber, os, osVersion, cpu, ramGb, storageGb, department, assignedTo, ipAddress, macAddress, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('assetTag', sql.NVarChar, assetTag).input('hostname', sql.NVarChar, hostname)
      .input('manufacturer', sql.NVarChar, manufacturer).input('model', sql.NVarChar, model)
      .input('serialNumber', sql.NVarChar, serialNumber).input('os', sql.NVarChar, os)
      .input('osVersion', sql.NVarChar, osVersion).input('cpu', sql.NVarChar, cpu)
      .input('ramGb', sql.Int, ramGb).input('storageGb', sql.Int, storageGb)
      .input('department', sql.NVarChar, department).input('assignedTo', sql.NVarChar, assignedTo)
      .input('ipAddress', sql.NVarChar, ipAddress).input('macAddress', sql.NVarChar, macAddress)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE hardware_assets SET asset_tag=@assetTag,hostname=@hostname,manufacturer=@manufacturer,model=@model,serial_number=@serialNumber,os=@os,os_version=@osVersion,cpu=@cpu,ram_gb=@ramGb,storage_gb=@storageGb,department=@department,assigned_to=@assignedTo,ip_address=@ipAddress,mac_address=@macAddress,status=@status WHERE id=@id`);
    res.json({ status: 'success', data: null, message: 'Updated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, parseInt(req.params.id)).query('DELETE FROM hardware_assets WHERE id = @id');
    res.json({ status: 'success', data: null, message: 'Deleted' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
