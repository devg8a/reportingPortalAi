// schedulers/draft-campaign-scheduler.ts

import logger from '../utils/logger';
import ClientDetails from '../db/models/clientDetails';
import ClientConnections from '../db/models/clientConnections';
import { KlaviyoService } from '../liberaries/PaidMedia/Klaviyo/klaviyo-service';
import { MarketingCalendarModel } from '../db/models/marketing-calendar';
import { getMongoDbObjectId } from '../helper/helper';

export class DraftCampaignScheduler {

    /**
     * Fetch draft campaigns for all active Klaviyo clients
     */
    static async fetchDraftCampaignsForAllClients() {
        try {
            // Step 1: Fetch all active clients
            const activeClients = await ClientDetails.find({
                status: 'active'
            }).select('_id name').lean();

            console.log(activeClients, "ojb")



            const clientIds = activeClients.map(c => c._id);

            // Step 2: Fetch Klaviyo connections for these clients
            const klaviyoConnections = await ClientConnections.find({
                client_id: { $in: clientIds },
                network: 'klaviyo',
                status: 'active',
                value: { $exists: true, $ne: null }
            }).select('client_id value').lean();

            console.log(klaviyoConnections, "klaviyoConnections")

            logger.info(`🔗 Found ${klaviyoConnections.length} active Klaviyo connections`);

            if (klaviyoConnections.length === 0) {
                logger.warn('⚠️ No active Klaviyo connections found');
                return;
            }

            // Step 3: Calculate date range (yesterday - 30 days)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 1);
            endDate.setUTCHours(23, 59, 59, 999);

            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 29);
            startDate.setUTCHours(0, 0, 0, 0);

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            logger.info(`📅 Fetching campaigns from ${startDateStr} to ${endDateStr}`);

            // Step 4: Process each connection
            let totalProcessed = 0;
            let totalErrors = 0;

            for (const connection of klaviyoConnections) {
                try {
                    const client = activeClients.find(
                        c => c._id.toString() === connection.client_id.toString()
                    );

                    if (!client) continue;

                    logger.info(`🔄 Processing client: ${client.name} (${client._id})`);

                    await this.fetchAndStoreCampaigns(
                        client._id.toString(),
                        connection._id.toString(),
                        connection.value,
                        startDateStr,
                        endDateStr
                    );

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
✅ Draft Campaign Scheduler completed
📊 Stats:
   - Total connections processed: ${totalProcessed}
   - Total errors: ${totalErrors}
   - Date range: ${startDateStr} to ${endDateStr}
            `);

        } catch (error: any) {
            logger.error(error, '❌ Fatal error in Draft Campaign Scheduler');
        }
    }

    /**
     * Fetch and store campaigns for a single client (both email and SMS)
     */
    static async fetchAndStoreCampaigns(
        clientId: string,
        connectionId: string,
        privateKey: string,
        startDate: string,
        endDate: string
    ) {
        const klaviyoService = new KlaviyoService();
        const channels: ('email' | 'sms')[] = ['email', 'sms'];

        for (const channel of channels) {
            try {
                logger.info(`  📧 Fetching ${channel} campaigns...`);

                const campaigns = await klaviyoService.getDraftCampaignsForCalendar(
                    { startDate, endDate, privateKey },
                    channel,
                    ['Draft'],
                    false
                );

                logger.info(`  ✅ Fetched ${campaigns.length} ${channel} draft campaigns`);

                if (campaigns.length === 0) continue;

                const bulkOps = campaigns.map((campaign) => ({
                    updateOne: {
                        filter: { campaign_id: campaign.id },
                        update: {
                            $setOnInsert: {
                                campaign_id: campaign.id,
                                created_at: new Date(),
                            },
                            $set: {
                                client_id: getMongoDbObjectId(clientId),
                                connection_id: getMongoDbObjectId(connectionId),
                                campaign_name: campaign.name,
                                channel: campaign.channel === 'sms' ? 'sms' : 'email',
                                status: "pending",
                                send_time: campaign.send_time ? new Date(campaign.send_time) : null,
                                archived: campaign.archived,
                                audiences: campaign.audiences,
                                message_id: campaign.message_id || null,
                                type: 'draft',
                                updated_at: new Date(),
                            },
                        },
                        upsert: true,
                    },
                }));

                const result = await MarketingCalendarModel.bulkWrite(bulkOps as any, {
                    ordered: false,
                });

                logger.info(
                    `  ✅ ${channel}: Inserted ${result.upsertedCount}, Updated ${result.modifiedCount}`
                );

            } catch (error: any) {
                logger.error(error, `  ❌ Error fetching ${channel} campaigns: ${error.message}`);
            }
        }
    }

    /**
     * Manual trigger for testing
     */
    static async runManually() {
        logger.info('🔧 Manually triggered Draft Campaign Scheduler');
        await this.fetchDraftCampaignsForAllClients();
    }
}