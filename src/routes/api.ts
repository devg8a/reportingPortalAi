import express from 'express';
import * as testingController from "../controllers/testingController";
import { cache } from '../middleware/cacheMiddleware';
import { authMiddleware } from "../middleware/authMiddleware"

const router = express.Router();

router.post('/affiliate-netwotk-testing', cache(req => `store:${req.body.client_id}`, 300), testingController.affiliateNetworkTestingApi);
router.post('/integration-store', testingController.intgrationStore);
router.post('/create-store', testingController.createStore);
router.get('/fetch-active-client-list', testingController.fetchActiveClientList);
router.post('/impact-jobs-completion-webhook', testingController.impactJobCompletionWebhook);
router.post('/read-spreadsheet', testingController.readSpreadSheet);
router.get('/fetch-ga-accounts', testingController.fetchGaAccounts);
router.post('/fetch-ga-report', testingController.gaAnalyticsReport);
router.get('/fetch-meta-accounts', testingController.fetchMetaAccounts);
router.post('/fetch-meta-report', testingController.metaInsightReport);
router.get('/fetch-adword-accounts', testingController.fetchAdwordAccounts);
router.post('/fetch-adword-report', testingController.fetchAdwordReport);
router.get('/fetch-criteo-accounts', testingController.fetchCriteoAccounts);
router.post('/fetch-criteo-report', testingController.fetchCriteoReport);
router.get('/fetch-bing-accounts', testingController.fetchBingAccounts);
router.post('/fetch-bing-report', testingController.fetchBingReport);
router.get('/test-redis', testingController.testRedis);
router.get('/find-store', authMiddleware, testingController.findStore);
router.get('/monday-test', testingController.mondayTest);
router.get('/prepare-bulk-data', testingController.prepareBulkData);
router.post('/test-query', testingController.testQuery);
router.post('/fetch-shopify-report', testingController.shopifyReport);
router.post('/fetch-meta-new-ads', testingController.metaNewAds);
router.post('/test-refresh-token', testingController.testRefreshToken);
router.post('/klaviyo-test', testingController.klaviyoTest);
router.post('/fetch-shopify-performance-report', testingController.shopifyPerformanceReport);
router.post('/klaviyo-campaign-report', testingController.klaviyoCampaignReport);
router.post('/klaviyo-campaign-report-multi-metric', testingController.klaviyoCampaignReportMultiMetric);
router.post('/klaviyo-campaign-daily-report', testingController.klaviyoCampaignDailyReport);
router.post('/klaviyo-storage', testingController.klaviyoStorage);

export default router
