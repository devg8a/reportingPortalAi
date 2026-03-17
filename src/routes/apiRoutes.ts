import express from 'express';
import { getAccountSummary, getAllPerformanceEntities, getSportPerformanceReportv2, getTeamPerformanceReport } from '../controllers/accountSummaryController';
import { authMiddleware } from '../middleware/authMiddleware'; // ✅ ADD THIS
import { fetchVisibleClients, getHiddenClients, getPreferences, getVisibleClients, hideClient, savePreferences, unhideClient } from '../controllers/hideClientController';
import { divergenceReport, getChartData } from '../controllers/divergenceController';
import { refreshModuleData } from '../controllers/refreshApiController';
import { getEmailMarketingReport, klaviyoAudienceDetails, klaviyoCampaignPreview } from '../controllers/emailMarkeingController';
import { MarketingCalendarController } from '../controllers/marketingCalendarController';
import { createApprovalActivity, getApprovalActivity } from '../controllers/approvalActivityLogsController';


const router = express.Router();

// ✅ ADD authMiddleware to these routes
router.post('/account-summary/view', authMiddleware, getAccountSummary);
router.post('/account-summary/view/:clientId', authMiddleware, getAccountSummary);

// sport performance entities
router.get('/performance', authMiddleware, getAllPerformanceEntities);
router.post('/performance/reportV2', authMiddleware, getSportPerformanceReportv2);
router.get('/team-performance/:clientId', authMiddleware, getTeamPerformanceReport);

router.post('/hide-client', authMiddleware, hideClient);
router.get('/hidden-clients', authMiddleware, getHiddenClients);
router.post('/unhide-client/:clientId', authMiddleware, unhideClient);
router.get('/visible-clients', authMiddleware, getVisibleClients);

// Divergence
router.post('/divergence-report', authMiddleware, divergenceReport);
router.post('/divergence-chart-data', authMiddleware, getChartData);

// Refresh Api
router.post("/refresh", refreshModuleData);


// Preferences
router.get('/preferences', authMiddleware, getPreferences);
router.post('/preferences', authMiddleware, savePreferences);

// email marketing
router.post('/email-marketing-report', authMiddleware, getEmailMarketingReport);


router.post('/klaviyo-campaign-preview', klaviyoCampaignPreview);
router.post('/klaviyo-campaign-audience', klaviyoAudienceDetails);

router.post('/marketing-calendar-list', MarketingCalendarController.mondayCalenderList);
router.post('/marketing-calendar', MarketingCalendarController.fetchDraftCampaigns);
router.post('/marketing-calendar/create-proposal', MarketingCalendarController.createProposal);
router.post('/marketing-calendar/update-proposal', MarketingCalendarController.updateProposal);


router.post('/approval-activity', authMiddleware, createApprovalActivity);
router.get('/approval-activity', authMiddleware, getApprovalActivity);

export default router;