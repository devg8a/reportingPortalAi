// schedulers/email-marketing-scheduler.ts

import logger from '../utils/logger';
import ClientDetails from '../db/models/clientDetails';
import ClientConnections from '../db/models/clientConnections';
import redisClient from '../config/redisClient';
import moment from 'moment';
import { getMongoDbObjectId } from '../helper/helper';

export class EmailMarketingScheduler {

    /**
     * Fetch all Klaviyo clients and pre-calculate their reports
     */
    static async preCalculateEmailMarketingReports() {
        try {
            logger.info('📊 Email Marketing Report Scheduler started');

            // Step 1: Fetch all active clients
            const activeClients = await ClientDetails.find({
                status: 'active'
            }).select('_id name').lean();



            const clientIds = activeClients.map(c => c._id);

            // Step 2: Fetch Klaviyo connections
            const klaviyoConnections = await ClientConnections.find({
                client_id: { $in: clientIds },
                network: 'klaviyo',
                status: 'active'
            }).select('client_id').lean();

            logger.info(`🔗 Found ${klaviyoConnections.length} active Klaviyo connections`);

            if (klaviyoConnections.length === 0) {
                logger.warn('⚠️ No active Klaviyo connections found');
                return;
            }

            // Step 3: Calculate date ranges
            const today = moment().subtract(1, 'day'); // Yesterday

            // MTD (Month to Date) - 1st of current month to yesterday
            const mtdStart = today.clone().startOf('month').format('YYYY-MM-DD');
            const mtdEnd = today.format('YYYY-MM-DD');

            // Last 7 days
            const last7Start = today.clone().subtract(6, 'days').format('YYYY-MM-DD');
            const last7End = today.format('YYYY-MM-DD');

            // Last 30 days
            const last30Start = today.clone().subtract(29, 'days').format('YYYY-MM-DD');
            const last30End = today.format('YYYY-MM-DD');

            // Last Month (complete)
            const lastMonthStart = today.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
            const lastMonthEnd = today.clone().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

            const dateRanges = [
                { key: 'MTD', startDate: mtdStart, endDate: mtdEnd, label: 'Month to Date' },
                { key: 'LAST_7_DAYS', startDate: last7Start, endDate: last7End, label: 'Last 7 Days' },
                { key: 'LAST_30_DAYS', startDate: last30Start, endDate: last30End, label: 'Last 30 Days' },
                { key: 'LAST_MONTH', startDate: lastMonthStart, endDate: lastMonthEnd, label: 'Last Month' }
            ];

            logger.info(`📅 Date ranges calculated:`);
            dateRanges.forEach(range => {
                logger.info(`   - ${range.label}: ${range.startDate} to ${range.endDate}`);
            });

            // Step 4: Process each client
            let totalProcessed = 0;
            let totalCached = 0;
            let totalErrors = 0;

            for (const connection of klaviyoConnections) {
                try {
                    const client = activeClients.find(
                        c => c._id.toString() === connection.client_id.toString()
                    );

                    if (!client) continue;

                    logger.info(`🔄 Processing client: ${client.name} (${client._id})`);

                    // Process each date range
                    for (const range of dateRanges) {
                        try {
                            await this.cacheReportData(
                                client._id.toString(),
                                range.startDate,
                                range.endDate,
                                range.key
                            );
                            totalCached++;
                            logger.info(`   ✅ Cached ${range.label} report`);
                        } catch (error: any) {
                            logger.error(error, `   ❌ Failed to cache ${range.label}: ${error.message}`);
                            totalErrors++;
                        }
                    }

                    totalProcessed++;

                } catch (error: any) {
                    totalErrors++;
                    logger.error(
                        error,
                        `❌ Error processing client ${connection.client_id}: ${error.message}`
                    );
                }
            }

            logger.info(`
✅ Email Marketing Report Scheduler completed
📊 Stats:
   - Total clients processed: ${totalProcessed}
   - Total reports cached: ${totalCached}
   - Total errors: ${totalErrors}
            `);

        } catch (error: any) {
            logger.error(error, '❌ Fatal error in Email Marketing Report Scheduler');
        }
    }

    /**
     * Cache report data in Redis
     */
    static async cacheReportData(
        clientId: string,
        startDate: string,
        endDate: string,
        rangeKey: string
    ) {
        const cacheKey = `email_marketing_report:${clientId}:${rangeKey}`;

        const payload = {
            clientId,
            startDate,
            endDate,
            rangeKey,
            comparison: false,
            cachedAt: new Date().toISOString()
        };

        // Store in Redis with 25 hours expiry (slightly more than 24 to avoid edge cases)
        await redisClient.set(
            cacheKey,
            JSON.stringify(payload),
            { EX: 90000 } // 25 hours in seconds
        );

        logger.info(`   💾 Cached: ${cacheKey}`);
    }

    /**
     * Manual trigger for testing
     */
    static async runManually() {
        logger.info('🔧 Manually triggered Email Marketing Report Scheduler');
        await this.preCalculateEmailMarketingReports();
    }

    /**
     * Get cached report data (to be used in controller)
     */
    static async getCachedReport(clientId: string, rangeKey: string) {
        const cacheKey = `email_marketing_report:${clientId}:${rangeKey}`;

        const cached = await redisClient.get(cacheKey);

        if (!cached) return null;

        try {
            return JSON.parse(cached);
        } catch {
            return null;
        }
    }
}