import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import authRoutes from './auth';
import dashboardRoutes from './dashboard';
import hardwareRoutes from './hardware';
import softwareRoutes from './software';
import networkRoutes from './network';
import patchRoutes from './patches';
import { appMeteringRouter, internetMeteringRouter } from './metering';
import remoteRoutes from './remote';
import reportsRoutes from './reports';
import eventLogRoutes from './eventLogs';
import settingsRoutes from './settings';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/hardware', authMiddleware, hardwareRoutes);
router.use('/software', authMiddleware, softwareRoutes);
router.use('/network', authMiddleware, networkRoutes);
router.use('/patches', authMiddleware, patchRoutes);
router.use('/application-metering', authMiddleware, appMeteringRouter);
router.use('/internet-metering', authMiddleware, internetMeteringRouter);
router.use('/remote-sessions', authMiddleware, remoteRoutes);
router.use('/reports', authMiddleware, reportsRoutes);
router.use('/event-logs', authMiddleware, eventLogRoutes);
router.use('/settings', authMiddleware, settingsRoutes);

export default router;
