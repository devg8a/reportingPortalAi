import express from 'express';
const router = express.Router();

import { runDailyRefresh } from '../schedulers/dailyNetworkPerformanceScheduler';
import { enqueueJob, getJob } from '../utils/asyncJobs';
import { getPerformanceClientDetailCrone, runHourlySummaryOptimized } from '../services/accountSummaryService';
import { runNewAdsAutoMapperCron } from '../schedulers/runNewAdsAutoMapperCron';
import { activeClientListFetch } from '../schedulers/activeClientList';
import { DraftCampaignScheduler } from '../schedulers/DraftCampaignScheduler';
import { EmailMarketingScheduler } from '../schedulers/EmailMarketingScheduler';
import { cronSyncAllNetworkAccounts } from '../controllers/networkAccountController';
import { enqueuePendingJobs } from '../enqueue';

router.get("/manual-refresh", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    await runDailyRefresh(
      startDate && endDate
        ? {
          start_date: String(startDate),
          end_date: String(endDate),
        }
        : undefined
    );
    res.json({ success: true,status_code: 200, message: "Daily refresh completed",data:[]  });
  } catch (e) {
    res.status(500).json({ success: false,status_code: 500,message: "Error In Daily refresh." ,data: e });
  }
});

router.get("/manual-hourly-refresh", async (req, res) => {
  try {
    console.log("MANUAL HOURLY REFRESH QUEUED");

    enqueueJob('hourly-summary-refresh', async () => {
      await runHourlySummaryOptimized();
    });

    return res.status(200).json({
      success: true,
      status_code: 200,
      message: "Hourly refresh queued and processing in background.",
      data:[],

    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Failed to queue hourly refresh",
      data: e?.message || e
    });
  }
});


router.get("/manual-performance-detail", async (req, res) => {
  try {
    console.log("MANUAL PERFORMANCE DETAIL CRON STARTED");
    await getPerformanceClientDetailCrone();
    return res.json({
      success: true,
      status_code: 200,
      message: "Performance detail cron completed for fixed clients",
      data:[]
    });
  } catch (e: any) {
    console.error("MANUAL PERFORMANCE DETAIL CRON FAILED:", e?.message || e);
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "Performance detail cron failed",
      data: e?.message || e
    });
  }
});

router.get("/manual-new-ads-mapper", async (req, res) => {
  try {
    console.log("MANUAL NEW ADS AUTO MAPPER CRON STARTED");

    const job = enqueueJob('new-ads-auto-mapper', async () => {
      await runNewAdsAutoMapperCron();
    });

    return res.status(202).json({
      success: true,
      status_code: 200,
      message: "New Ads Auto Mapper queued and processing in background.",
      data: "Check console/logs for detailed progress. Email will be sent after completion."
    });
  } catch (e: any) {
    console.error("MANUAL NEW ADS AUTO MAPPER FAILED:", e?.message || e);
    return res.status(500).json({
      success: false,
      status_code: 500,
      message: "New Ads Auto Mapper failed",
      data: e?.message || e
    });
  }
});

router.get('/active-client-list-sync', activeClientListFetch);

router.get('/cron-test', async (req, res) => {
  const response = await cronSyncAllNetworkAccounts();
  return res.status(200).json({
    status_code: 200,
    success: false,
    message: "",
    data: response
  });
});

router.get("/trigger-pending-jobs", async (req, res) => {
  enqueuePendingJobs().catch(console.error);
  return res.status(200).json({
    status_code: 200,
    success: true,
    message: "Enqueue started",
  });
});

// Job status (for refresh endpoints)
router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  return res.status(200).json({ status_code: 200, success: true, message: "", data: job });
});

// Get latest hourly refresh job status
router.get('/jobs/hourly-refresh/latest', (req, res) => {

  return res.status(200).json({
    success: true,
    success_code: 200,
    message: 'Use /api/jobs/:id with the jobId returned from /manual-hourly-refresh',
    data: 'Job ID is returned when you call /manual-hourly-refresh'
  });
});

router.post('/manual/fetch-draft-campaigns', async (req, res) => {
  try {
    await DraftCampaignScheduler.runManually();
    res.json({ success: true,status_code:200, message: 'Scheduler triggered manually',data:[] });
  } catch (error: any) {
    res.status(500).json({ success: false,status_code:200, message: error.message,data:[] });
  }
});

router.post('/manual/email-marketing-reports', async (req, res) => {
  try {
    await EmailMarketingScheduler.runManually();
    res.json({ success: true,status_code:200, message: 'Email Marketing Report Scheduler triggered manually',data:[] });
  } catch (error: any) {
    res.status(500).json({ success: false,status_code:500, message: error.message,data:error });
  }
});

export default router;