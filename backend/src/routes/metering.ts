import { Router } from 'express';
import { getAppMetering, getAppStats, getInternetMetering, getInternetStats } from '../controllers/meteringController';

export const appMeteringRouter = Router();
appMeteringRouter.get('/stats', getAppStats);
appMeteringRouter.get('/', getAppMetering);

export const internetMeteringRouter = Router();
internetMeteringRouter.get('/stats', getInternetStats);
internetMeteringRouter.get('/', getInternetMetering);
