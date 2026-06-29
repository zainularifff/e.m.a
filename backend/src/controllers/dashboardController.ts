import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const [assets, agents, alerts, patches, network, software] = await Promise.all([
      pool.request().query('SELECT COUNT(*) as cnt FROM hardware_assets'),
      pool.request().query("SELECT COUNT(*) as cnt FROM hardware_assets WHERE status = 'Active'"),
      pool.request().query("SELECT COUNT(*) as cnt FROM event_logs WHERE severity = 'Critical'"),
      pool.request().query('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'Completed\' THEN 1 ELSE 0 END) as completed FROM patch_records'),
      pool.request().query('SELECT COUNT(*) as cnt FROM network_devices'),
      pool.request().query('SELECT COUNT(*) as cnt FROM software_inventory'),
    ]);
    const patchTotal = patches.recordset[0].total || 1;
    const patchCompleted = patches.recordset[0].completed || 0;
    res.json({
      status: 'success',
      data: {
        totalAssets: assets.recordset[0].cnt,
        activeAgents: agents.recordset[0].cnt,
        criticalAlerts: alerts.recordset[0].cnt,
        patchCompliance: Math.round((patchCompleted / patchTotal) * 100),
        networkDevices: network.recordset[0].cnt,
        softwareCount: software.recordset[0].cnt,
      },
      message: '',
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function getCharts(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await getPool();
    const [osDist, deptAssets, patchSev] = await Promise.all([
      pool.request().query('SELECT os as name, COUNT(*) as value FROM hardware_assets GROUP BY os'),
      pool.request().query('SELECT department as dept, COUNT(*) as count FROM hardware_assets GROUP BY department'),
      pool.request().query('SELECT severity as name, COUNT(*) as value FROM patch_records GROUP BY severity'),
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const assetTrend = months.slice(0, 8).map((month, i) => ({ month, assets: 80 + i * 15 + Math.floor(Math.random() * 20) }));

    res.json({
      status: 'success',
      data: {
        assetTrend,
        osDistribution: osDist.recordset,
        departmentAssets: deptAssets.recordset,
        patchStatus: patchSev.recordset,
      },
      message: '',
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
}
