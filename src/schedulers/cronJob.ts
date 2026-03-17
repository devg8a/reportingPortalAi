import cron from "node-cron";
import logger from '../utils/logger';
import { enqueuePendingJobs } from '../enqueue';

export function startCronJobs() {
  /**
   * Format: *minute *hour *day *month *day-of-week
   */
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        setInterval(enqueuePendingJobs, 60000);
      } catch (error) {
        logger.error(error);
      }
    },
    {
      timezone: "Asia/Kolkata", // ✅ This IS supported in all versions
    },
  );
}
