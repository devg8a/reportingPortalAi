const bizSdk = require('facebook-nodejs-business-sdk');
import { buildDaywiseMetrics } from "./meta-utils";
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { captureToCentralStorage } from "../../../db/schema/capture-central-storage";

/**
 * API documentation:https://developers.facebook.com/docs/business-sdk/getting-started#js
 * Node Package: https://www.npmjs.com/package/facebook-nodejs-business-sdk
 */

export class MetaService {
    private FacebookAdsApi = bizSdk.FacebookAdsApi;
    constructor() {
        this.FacebookAdsApi.init(process.env.META_ACCESS_TOKEN);
        // this.FacebookAdsApi.init(process.env.META_ACCESS_TOKEN).setDebug(true);
    }

    async getMetaAccounts() {
        try {
            const User = bizSdk.User;
            const me = new User('me');
            const adAccounts = await me.getAdAccounts(['account_id', 'name']);
            const accountsList = adAccounts.map((acc: any) => ({
                account_id: acc.account_id,
                name: acc.name
            }));
            return accountsList;
        } catch (error) {
            logger.error(error, 'Meta Accounts Error: ');
        }
    }

    async getMetaAccountData(requestData) {
        try {
            const AdAccount = bizSdk.AdAccount;
            const account = new AdAccount(`act_${requestData?.accountId}`);
            const fields = [
                'outbound_clicks',
                'clicks',
                'impressions',
                'spend',
                'reach',
                'actions',
                'action_values'
            ];

            const params = {
                time_range: { since: requestData?.startDate, until: requestData?.endDate },
                level: 'account', // account | campaign | adset | ad
                time_increment: 1, //daily
                // breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
                action_attribution_windows: [
                    '1d_view',
                    '7d_click',
                ],
                filtering: [
                    {
                        field: 'campaign.name',
                        operator: 'NOT_CONTAIN',
                        value: 'EXCLUDE'
                    },
                    {
                        field: 'action_type',
                        operator: 'IN',
                        value: ['omni_purchase'],
                    },

                ],
                limit: 1500
            };

            if (requestData?.granularity === 'hourly') {
                (params as any).breakdowns = 'hourly_stats_aggregated_by_advertiser_time_zone';
                // Remove time_increment if using hourly breakdown to avoid conflict (Meta limitation sometimes)
                // Actually Meta allows time_increment: 1 AND hourly breakdown.
            }

            const insightsData = await account.getInsights(fields, params);
            const result = buildDaywiseMetrics(insightsData);

            // // 🔍 DEBUG: Log action values
            // if (insightsData && insightsData.length > 0) {
            //     console.log("🔍 Meta Account Data [action_values]:", JSON.stringify(insightsData[0].action_values, null, 2));
            // }
            // console.log(result, "result")

            if (requestData?.granularity !== "hourly") {
                await captureToCentralStorage(result, requestData.clientId, requestData.connectionId, "meta");
            }
            return result;
        } catch (error) {
            await ErrorLogs.insertOne({
                client_id: requestData?.clientId,
                connection_id: requestData?.connectionId,
                network: "meta",
                start_date: requestData?.startDate,
                end_date: requestData?.endDate,
                error: JSON.stringify(error)
            });
            logger.error(error, 'Meta Account Data Error: ');
            throw error;
        }
    }


    async getMetaAdData(requestData) {
        try {
            this.FacebookAdsApi.init(process.env.META_ACCESS_TOKEN);

            const AdAccount = bizSdk.AdAccount;
            const account = new AdAccount(`act_${requestData.accountId}`);

            const fields = [
                'campaign_name',
                'adset_name',
                'ad_name',
                'ad_id',
                'spend',
                'action_values',
                'date_start',
                'date_stop'
            ];

            const filtering: any[] = [
                {
                    field: 'action_type',
                    operator: 'IN',
                    value: ['omni_purchase']
                }
            ];

            // Optional: filter by ad name substring (for special client)
            if (requestData.nameContains) {
                filtering.push({
                    field: 'ad.name',
                    operator: 'CONTAIN',
                    value: requestData.nameContains
                });
            }

            // Optional: ad.id filter (default: ON, but special client will skip)
            if (!requestData.skipAdIdFilter) {
                filtering.push({
                    field: 'ad.id',
                    operator: 'IN',
                    value: requestData?.adId ? requestData?.adId : []
                });
            }

            const params = {
                time_range: {
                    since: requestData.startDate,
                    until: requestData.endDate
                },
                level: 'ad',

                time_increment: 1,

                action_attribution_windows: [
                    '1d_view',
                    '7d_click',
                ],

                filtering
            };

            const insights = await account.getInsights(fields, params);
            // console.log(insights, "insights")

            // 🔍 DEBUG: Log action values for Ads
            // if (insights && insights.length > 0) {
            //     console.log("🔍 Meta Ad Data [action_values sample]:", JSON.stringify(insights[0].action_values, null, 2));
            // }

            return insights.map((data: any) => ({
                campaign_name: data.campaign_name,
                adset_name: data.adset_name,
                ad_name: data.ad_name,
                ad_id: data.ad_id,
                spend: Number(data.spend || 0),
                date_start: data.date_start,   // 👈 DAILY
                date_stop: data.date_stop,
                action_values: data.action_values || []
            }));

        } catch (error) {
            console.error('Meta API Error:', error);
            throw error;
        }
    }


    async fetchNewAds(requestData) {
        const startDate = new Date(requestData.startDate).getTime() / 1000;
        const endDate = new Date(requestData.endDate).getTime() / 1000;
        try {
            const AdAccount = bizSdk.AdAccount;
            const account = new AdAccount(`act_${requestData?.accountId}`);

            const fields = [
                'id',
                'name',
                'created_time',
            ];

            const params = {
                filtering: [
                    {
                        field: 'created_time',
                        operator: 'IN_RANGE',
                        value: [startDate, endDate]
                    },
                ],
            };

            const adsCursor = await account.getAds(fields, params);
            const adsData = [];
            for await (const ad of adsCursor) {
                adsData.push({
                    id: ad?.id,
                    name: ad?.name,
                    created_time: ad?.created_time,
                });
            }
            return adsData;
        } catch (error) {
            logger.error(error, 'New Ads Error:');
        }
    }
}

