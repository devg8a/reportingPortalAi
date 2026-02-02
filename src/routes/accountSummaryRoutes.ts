
import express from 'express';
import { getAccountSummary, refreshAccountSummary, fixTimestamps, getAllPerformanceEntities, getPerformanceClientDetailPost } from '../controllers/accountSummaryController';
import { hideClient, getHiddenClients, unhideClient } from '../controllers/hideClientController';

const router = express.Router();

router.post('/account-summary/view', getAccountSummary);
router.post('/account-summary/view/:clientId', getAccountSummary);
router.get('/account-summary/refresh', refreshAccountSummary);
router.get('/account-summary/fix-timestamps', fixTimestamps);

// Hide client routes
router.post('/hide-client', hideClient);
router.get('/hide-client', getHiddenClients);
router.delete('/hide-client/:client_id', unhideClient);

// sport performance entities
router.get('/performance', getAllPerformanceEntities);
router.post("/performance/client-detail", getPerformanceClientDetailPost);



export default router;
