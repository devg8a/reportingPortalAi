import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import * as http from 'http';
import * as https from 'https';
import fs from 'fs';
import router from './routes/api';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger';
import { connectRedis } from './config/redisClient';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import logRoutes from './routes/logRoutes';
import clientStoreRoutes from './routes/clientRoutes';
import designationRoutes from './routes/designationRoutes';
import holidayRoutes from './routes/holidayRoutes';
import modulesRoutes from './routes/moduleRoutes';
import goalRoutes from './routes/goalRoutes';
import clientSettingRoutes from './routes/clientSettingRoutes';
import networkAccountRoutes from './routes/networkAccountRoutes';
import utilityRoutes from './routes/utilityRoutes';
import manualCronRoutes from './routes/manualCronRoutes';
import connectDB from './db/connection';
import apiRoutes from './routes/apiRoutes';
import webhookRoutes from './routes/webhookRoutes';
if (process.env.ENABLE_SCHEDULER === "true") {
  import("./workers/scheduler.worker");
}
import { startCronJobs } from "./schedulers/cronJob";

dotenv.config();
const app = express();

connectRedis();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/**Routes configuration**/
app.use('/', router);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/client-store', clientStoreRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/setting', clientSettingRoutes);
app.use('/api', apiRoutes);
app.use('/api', networkAccountRoutes);
app.use('/trigger-cron',manualCronRoutes);
app.use('/api/utility', utilityRoutes);
app.use('/webhook', webhookRoutes);

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

/**DB connection**/
connectDB();

if (process.env.ENABLE_SCHEDULER === 'true') {
  console.log("***Daily schedular Running***");
  startCronJobs();
}

/**Server creation**/
http.createServer(app).listen(process.env.NODE_PORT, () => {
  logger.info(process.env.NODE_ENV + " Server")
  logger.info('HTTP Server running on Port: ' + process.env.NODE_PORT)
})

/**Enable when ssl start working
if (process.env.NODE_ENV == 'local') {
  http.createServer(app).listen(process.env.NODE_PORT, () => {
    logger.info(process.env.NODE_ENV + " Server")
    logger.info('HTTP Server running on Port: ' + process.env.NODE_PORT)
  })
}else {
  const options = {
      key: fs.readFileSync('/etc/letsencrypt/live/apireports.group8a.com/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/apireports.group8a.com/fullchain.pem')
    };
  https.createServer(options,app).listen(process.env.NODE_PORT, () => {
      logger.info(process.env.NODE_ENV + " Server")
      logger.info('HTTPS Server running on '+ process.env.NODE_PORT)
  })
}**/