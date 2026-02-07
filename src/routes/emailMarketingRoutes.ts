import express from 'express';
import {
    getEmailMarketingSummary,
    getEmailMarketingCampaigns,
    getEmailMarketingBenchmarks,
    getEmailMarketingFlows,
} from '../controllers/emailMarketingController';

const router = express.Router();

router.post('/summary', getEmailMarketingSummary);
router.post('/campaigns', getEmailMarketingCampaigns);
router.post('/benchmarks', getEmailMarketingBenchmarks);
router.post('/flows', getEmailMarketingFlows);

export default router;
