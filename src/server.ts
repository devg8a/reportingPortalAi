import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import * as http from 'http';
import * as https from 'https';
import router from './routes/api';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import logger from './utils/logger';
import { connectRedis } from './config/redisClient';
import cron from 'node-cron';
import { enqueueJob, getJob } from './utils/asyncJobs';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import logRoutes from './routes/logRoutes';
import clientRoutes from './routes/clientIcpRoutes';
import clientStoreRoutes from './routes/clientRoutes';
import designationRoutes from './routes/designationRoutes';
// import reportAccessTypeRoutes from './routes/reportAccessTypeRoutes';
import holidayRoutes from './routes/holidayRoutes';
import modulesRoutes from './routes/moduleRoutes';
import goalRoutes from './routes/goalRoutes';
import clientSettingRoutes from './routes/clientSettingRoutes';
import accountSummaryRoutes from './routes/accountSummaryRoutes';
import { cronSyncAllNetworkAccounts } from './controllers/networkAccountController';
import networkAccountRoutes from './routes/networkAccountRoutes';

import utilityRoutes from './routes/utilityRout';
import connectDB from './db/connection';
import { runDailyRefresh } from './schedulers/dailyscheduler_chrone';
import { runHourlySummaryOptimized } from './services/accountSummaryService';


dotenv.config();
const app = express();

connectRedis();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**Routes configuration**/
app.use('/', router);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client-store', clientStoreRoutes);
app.use('/api/designations', designationRoutes);
// app.use('/api/report-access-types', reportAccessTypeRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/setting', clientSettingRoutes);
app.use('/api', accountSummaryRoutes);
app.use('/api', networkAccountRoutes);

app.use('/api/utility', utilityRoutes);

/**Health check route**/
app.get('/health', (req, res) => {
  res.status(200).json({
    status: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err, 'Global error: ');
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});





app.get("/manual-refresh", async (req, res) => {
  try {
    console.log("MANUAL REFRESH STARTED");
    await runDailyRefresh();
    return res.json({
      success: true,
      message: "Manual refresh completed"
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Manual refresh failed",
      error: e
    });
  }
});


app.get("/manual-hourly-refresh", async (req, res) => {
  try {
    console.log("MANUAL HOURLY REFRESH QUEUED");

    // Queue the job and return immediately (non-blocking)
    const job = enqueueJob('hourly-summary-refresh', async () => {
      await runHourlySummaryOptimized();
    });

    // Return immediately with job ID for status tracking
    return res.status(202).json({
      success: true,
      message: "Hourly refresh queued and processing in background.",

    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to queue hourly refresh",
      error: e?.message || e
    });
  }
});


// Job status (for refresh endpoints)
app.get('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  return res.status(200).json({ success: true, data: job });
});

// Get latest hourly refresh job status
app.get('/api/jobs/hourly-refresh/latest', (req, res) => {
  // This is a simple implementation - in production you might want to store jobs in DB
  // For now, we'll need to track the latest job ID or search through jobs
  return res.status(200).json({
    success: true,
    message: 'Use /api/jobs/:id with the jobId returned from /manual-hourly-refresh',
    note: 'Job ID is returned when you call /manual-hourly-refresh'
  });
});


/**DB connection**/
connectDB();


// Hourly cron - runs every hour (controlled by ENABLE_SCHEDULER env variable)
if (process.env.ENABLE_SCHEDULER === 'true') {
  cron.schedule("0 * * * *", async () => {
    console.log("Running hourly cron: Hourly Summary Refresh...");
    await runHourlySummaryOptimized();
  });
  console.log("✅ Hourly cron job enabled (runs every hour)");
} else {
  console.log("⏸️  Hourly cron job disabled (ENABLE_SCHEDULER=false)");
}

// Daily cron - runs every day at 2 AM (controlled by ENABLE_SCHEDULER env variable)
if (process.env.ENABLE_SCHEDULER === 'true') {
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled cron job: Syncing network accounts...');
    await cronSyncAllNetworkAccounts();
    await runDailyRefresh();
    console.log("All scheduled tasks completed.");
  });
  console.log("✅ Daily cron job enabled (runs at 2 AM)");
} else {
  console.log("⏸️  Daily cron job disabled (ENABLE_SCHEDULER=false)");
}

/**Server creation**/
if (process.env.NODE_ENV == 'local') {
  http.createServer(app).listen(process.env.NODE_PORT, () => {
    logger.info(process.env.NODE_ENV + " Server")
    logger.info('HTTP Server running on Port: ' + process.env.NODE_PORT)
  })
}
else {
  // const options = {
  //     key: fs.readFileSync('/etc/letsencrypt/live/apireports.group8a.com/privkey.pem'),
  //     cert: fs.readFileSync('/etc/letsencrypt/live/apireports.group8a.com/fullchain.pem')
  //   };
  // https.createServer(options,app).listen(process.env.NODE_PORT, () => {
  //     logger.info(process.env.NODE_ENV + " Server")
  //     logger.info('HTTPS Server running on '+ process.env.NODE_PORT)
  // })

  http.createServer(app).listen(process.env.NODE_PORT, () => {
    logger.info(process.env.NODE_ENV + " Server")
    logger.info('HTTP Server running on Port: ' + process.env.NODE_PORT)
  })
}