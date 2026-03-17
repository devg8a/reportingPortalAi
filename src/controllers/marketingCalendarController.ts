import { Request, Response } from 'express';
import logger from '../utils/logger';
import { KlaviyoService } from '../liberaries/PaidMedia/Klaviyo/klaviyo-service';
import { getMongoDbObjectId } from '../helper/helper';
import { MarketingCalendarModel } from '../db/models/marketing-calendar';
import { getCentralStorageModel } from '../db/schema/dynamic-central-model';
import {
    isPromoCampaign,
    extractDiscount,
    calculateDiff,
    shouldSkipCampaign,
    getClientFilterFields
} from '../helper/emailMarketingHelper';
import redisClient from '../config/redisClient';

export class MarketingCalendarController {

    static async fetchDraftCampaigns(req: Request, res: Response) {
        try {
            const {
                startDate,
                endDate,
                channel = 'email',
                clientId,
                connectionId,
                privateKey,
                enrichAudiences = false,
            } = req.body;

            // Validation
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate and endDate are required',
                });
            }

            if (!clientId || !connectionId) {
                return res.status(400).json({
                    success: false,
                    message: 'clientId and connectionId are required',
                });
            }

            if (!privateKey) {
                return res.status(400).json({
                    success: false,
                    message: 'privateKey is required',
                });
            }

            if (!['email', 'sms'].includes(channel)) {
                return res.status(400).json({
                    success: false,
                    message: 'channel must be either "email" or "sms"',
                });
            }

            // Type-safe channel
            const validChannel = channel as 'email' | 'sms';

            logger.info(`Fetching draft campaigns for client: ${clientId}, channel: ${validChannel}`);

            // Initialize Klaviyo service
            const klaviyoService = new KlaviyoService();

            // Fetch draft campaigns
            const campaigns = await klaviyoService.getDraftCampaignsForCalendar(
                { startDate, endDate, privateKey },
                validChannel,
                ['Draft'],
                enrichAudiences
            );

            logger.info(`Fetched ${campaigns.length} draft campaigns`);

            // Prepare bulk operations with proper typing
            const bulkOps = campaigns.map((campaign) => {
                console.log("campaign", campaign);
                // Ensure channel is properly typed
                const campaignChannel: 'email' | 'sms' =
                    campaign.channel === 'sms' ? 'sms' : 'email';

                return {
                    updateOne: {
                        filter: {
                            campaign_id: campaign.id,
                        },
                        update: {
                            $setOnInsert: {
                                campaign_id: campaign.id,
                                created_at: new Date(),
                            },
                            $set: {
                                client_id: getMongoDbObjectId(clientId),
                                connection_id: getMongoDbObjectId(connectionId),
                                campaign_name: campaign.name,
                                channel: campaignChannel, // Now properly typed
                                status: "pending",
                                send_time: campaign.send_time
                                    ? new Date(campaign.send_time)
                                    : null,
                                archived: campaign.archived,
                                audiences: campaign.audiences,
                                message_id: campaign.message_id || null,
                                type: 'draft', // <-- ADD THIS LINE

                                updated_at: new Date(),
                            },
                        },
                        upsert: true,
                    },
                };
            });

            // Execute bulk write
            if (bulkOps.length > 0) {
                const result = await MarketingCalendarModel.bulkWrite(bulkOps as any, {
                    ordered: false,
                });

                logger.info(`Marketing Calendar: Inserted ${result.upsertedCount}, Modified ${result.modifiedCount}`);

                return res.status(200).json({
                    success: true,
                    message: 'Draft campaigns fetched and stored successfully',
                    data: {
                        total_campaigns: campaigns.length,
                        inserted: result.upsertedCount,
                        updated: result.modifiedCount,
                        campaigns,
                    },
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'No draft campaigns found for the given date range',
                    data: {
                        total_campaigns: 0,
                        inserted: 0,
                        updated: 0,
                    },
                });
            }
        } catch (error: any) {
            logger.error(error, 'Error in MarketingCalendarController.fetchDraftCampaigns');
            return res.status(500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    }

    static async mondayCalenderList(req: Request, res: Response) {
        try {
            const { clientId, month } = req.body;
            const module_key = req?.header('x-module-key');
            const userId = (req as any).user?._id || null;

            console.log('- User ID:', userId);
            console.log('- moduleket:', module_key);

            const cacheKey = `${module_key}_${userId}`;

            const redisPayload = {
                userId,
                clientId,
                month,
                storedAt: new Date()
            };
            console.log(redisClient, "ccddss")

            // Redis store
            await redisClient.set(
                cacheKey,
                JSON.stringify(redisPayload),
                { EX: 86400 } // 24 hours
            );


            // ✅ Fetch filter fields from helper
            const filterFields = await getClientFilterFields(clientId);

            // ✅ Fixed - 31 Jan tak aayega (end of day)
            const currentStart = new Date(`${month}-01T00:00:00.000Z`);
            const currentEnd = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() + 1, 0, 23, 59, 59, 999));

            // MoM (previous month)
            const momStart = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 1, 1, 0, 0, 0, 0));
            const momEnd = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth(), 0, 23, 59, 59, 999));

            // YoY (same month last year)
            const yoyStart = new Date(Date.UTC(currentStart.getUTCFullYear() - 1, currentStart.getUTCMonth(), 1, 0, 0, 0, 0));
            const yoyEnd = new Date(Date.UTC(currentStart.getUTCFullYear() - 1, currentStart.getUTCMonth() + 1, 0, 23, 59, 59, 999));

            const fetchCampaigns = async (startDate: Date, endDate: Date) => {
                const year = startDate.getFullYear();
                const CentralStorageModel = getCentralStorageModel(`central_storage_${year}`);

                const records = await CentralStorageModel.find({
                    client_id: getMongoDbObjectId(clientId),
                    date: { $gte: startDate, $lte: endDate }
                }).select('data.campaigns').lean();

                const campaignsMap = new Map();

                records.forEach((record: any) => {
                    if (record.data?.campaigns) {
                        record.data.campaigns.forEach((campaign: any) => {
                            if (campaign.id) {
                                // ✅ Skip filtered campaigns
                                if (shouldSkipCampaign(campaign.name, filterFields)) return;

                                campaignsMap.set(campaign.id, campaign);
                            }
                        });
                    }
                });

                return Array.from(campaignsMap.values());
            };

            // ✅ Calculate stats for campaigns
            const calculateStats = (campaigns: any[]) => {
                const emailCampaigns = campaigns.filter(c => c.channel === 'email');
                const smsCampaigns = campaigns.filter(c => c.channel === 'sms');

                const calcChannelStats = (channelCampaigns: any[]) => {
                    const promos = channelCampaigns.filter(c => isPromoCampaign(c.name));
                    const discounts = promos.map(c => extractDiscount(c.name)).filter(d => d !== null) as number[];

                    return {
                        total: channelCampaigns.length,
                        promoCount: promos.length,
                        avgDiscount: discounts.length > 0
                            ? Number((discounts.reduce((a, b) => a + b, 0) / discounts.length).toFixed(2))
                            : 0
                    };
                };

                return {
                    email: calcChannelStats(emailCampaigns),
                    sms: calcChannelStats(smsCampaigns)
                };
            };

            // ✅ Fetch all periods
            const currentCampaigns = await fetchCampaigns(currentStart, currentEnd);
            const momCampaigns = await fetchCampaigns(momStart, momEnd);
            const yoyCampaigns = await fetchCampaigns(yoyStart, yoyEnd);

            const currentStats = calculateStats(currentCampaigns);
            const momStats = calculateStats(momCampaigns);
            const yoyStats = calculateStats(yoyCampaigns);

            // ✅ Build response
            const buildMetric = (curr: number, mom: number, yoy: number) => ({
                current: curr,
                mom: mom,
                momDiff: calculateDiff(curr, mom),
                yoy: yoy,
                yoyDiff: calculateDiff(curr, yoy)
            });

            // ✅ Build response - conditional SMS
            const stats: any = {
                email: {
                    avgDiscount: buildMetric(currentStats.email.avgDiscount, momStats.email.avgDiscount, yoyStats.email.avgDiscount),
                    numberOfEmail: buildMetric(currentStats.email.total, momStats.email.total, yoyStats.email.total),
                    numberOfPromoEmail: buildMetric(currentStats.email.promoCount, momStats.email.promoCount, yoyStats.email.promoCount)
                }
            };

            // ✅ SMS sirf tab add karo jab data ho
            const hasSms = currentStats.sms.total > 0 || momStats.sms.total > 0 || yoyStats.sms.total > 0;

            if (hasSms) {
                stats.sms = {
                    avgDiscount: buildMetric(currentStats.sms.avgDiscount, momStats.sms.avgDiscount, yoyStats.sms.avgDiscount),
                    numberOfSms: buildMetric(currentStats.sms.total, momStats.sms.total, yoyStats.sms.total),
                    numberOfPromoSms: buildMetric(currentStats.sms.promoCount, momStats.sms.promoCount, yoyStats.sms.promoCount)
                };
            }


            // ✅ Extract date from campaign name (e.g., "G8A 02/02/26 Email: Pinks + Reds" → "2026-02-02")
            const extractDateFromName = (name: string): string | null => {
                if (!name) return null;

                // Pattern: MM/DD/YY or M/D/YY or MM/D/YY or M/DD/YY
                const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
                const match = name.match(dateRegex);

                if (match) {
                    let [, month, day, year] = match;

                    // Convert 2-digit year to 4-digit
                    if (year.length === 2) {
                        const yearNum = parseInt(year);
                        year = (yearNum >= 50 ? '19' : '20') + year;
                    }

                    // Pad month and day with leading zeros
                    month = month.padStart(2, '0');
                    day = day.padStart(2, '0');

                    return `${year}-${month}-${day}`;
                }

                return null;
            };

            // ✅ Leagues list
            const LEAGUES = ['mlb', 'nba', 'nfl', 'nhl'];

            // ✅ Detect leagues from campaign name
            const detectLeagues = (name: string): string[] => {
                if (!name) return ['all'];

                const nameLower = name.toLowerCase();
                const matchedLeagues: string[] = [];

                LEAGUES.forEach(league => {
                    if (nameLower.includes(league)) {
                        matchedLeagues.push(league);
                    }
                });

                // Always add 'all'
                matchedLeagues.push('all');

                // If no league matched, only 'all' will be there
                return matchedLeagues;
            };

            // ✅ Quartile formula (from PHP)
            const calculateQuartile = (arr: number[], quartile: number = 0.75): number => {
                if (arr.length === 0) return 0;

                const sorted = [...arr].sort((a, b) => a - b);
                const pos = (sorted.length - 1) * quartile;
                const base = Math.floor(pos);
                const rest = pos - base;

                if (sorted[base + 1] !== undefined) {
                    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
                } else {
                    return sorted[base];
                }
            };

            // ✅ Extract percent from campaign name
            const extractPercent = (name: string): number | null => {
                if (!name) return null;
                if (!isPromoCampaign(name)) return null;

                const nameLower = name.toLowerCase();

                // Pattern 1: 30%, 50%, etc.
                const percentMatch = name.match(/(\d+)\s*%/);
                if (percentMatch) return parseInt(percentMatch[1]);

                // Pattern 2: promo 20, promo20, 20 promo
                const promoMatch = nameLower.match(/promo\s*(\d+)|(\d+)\s*promo/);
                if (promoMatch) return parseInt(promoMatch[1] || promoMatch[2]);

                // Pattern 3: 25 percent, percent 25
                const percentWordMatch = nameLower.match(/(\d+)\s*percent|percent\s*(\d+)/);
                if (percentWordMatch) return parseInt(percentWordMatch[1] || percentWordMatch[2]);

                return null;
            };

            // ✅ Updated buildDateWiseCalendar function
            const buildDateWiseCalendar = async (startDate: Date, endDate: Date, campaigns: any[], clientId: string, isTabsClient: boolean = false) => {
                const calendar: Record<string, any> = {};
                const today = new Date();
                today.setUTCHours(23, 59, 59, 999);

                const resolveAnyDateKey = (obj: any): string | null => {
                    // 1) startDate
                    const start = obj.startDate || obj.start_date;
                    if (start) {
                        const d = new Date(start);
                        if (!isNaN(d.getTime())) {
                            const key = d.toISOString().split('T')[0];
                            if (calendar.hasOwnProperty(key)) return key;
                        }
                    }

                    // 2) send_time
                    if (obj.send_time) {
                        const d = new Date(obj.send_time);
                        if (!isNaN(d.getTime())) {
                            const key = d.toISOString().split('T')[0];
                            if (calendar.hasOwnProperty(key)) return key;
                        }
                    }

                    // 3) created_at
                    if (obj.created_at) {
                        const d = new Date(obj.created_at);
                        if (!isNaN(d.getTime())) {
                            const key = d.toISOString().split('T')[0];
                            if (calendar.hasOwnProperty(key)) return key;
                        }
                    }

                    return null;
                };

                // Generate dates (only past + today, skip future)
                const currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    if (currentDate <= today) {
                        const dateKey = currentDate.toISOString().split('T')[0];
                        calendar[dateKey] = {
                            campaignData: [],
                            aggregate: {
                                high: 0,
                                highPercent: 0,
                                low: 0,
                                lowPercent: 0
                            }
                        };
                    }
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                }

                // ✅ First pass: Group campaigns by date
                const campaignsByDate: Record<string, any[]> = {};

                campaigns.forEach((campaign: any) => {
                    if (!campaign.send_time) return;

                    const nameDate = extractDateFromName(campaign.name);
                    let dateKey = campaign.send_time.split('T')[0];

                    if (nameDate && calendar.hasOwnProperty(nameDate)) {
                        dateKey = nameDate;
                    }

                    if (calendar.hasOwnProperty(dateKey)) {
                        if (!campaignsByDate[dateKey]) {
                            campaignsByDate[dateKey] = [];
                        }
                        campaignsByDate[dateKey].push(campaign);
                    }
                });

                // ✅ Second pass: Calculate Q3 per date and format campaigns
                Object.keys(campaignsByDate).forEach(dateKey => {
                    const dateCampaigns = campaignsByDate[dateKey];

                    // Calculate Q3 for this date only
                    const dateRevenues = dateCampaigns
                        .map(c => Number(c.statistics?.conversion_value || 0))
                        .filter(r => r > 0);

                    const q3Threshold = calculateQuartile(dateRevenues, 0.75);

                    // Track percents for high and low
                    const highPercents: number[] = [];
                    const lowPercents: number[] = [];

                    // Format campaigns with performance
                    dateCampaigns.forEach(campaign => {
                        const revenue = Number(campaign.statistics?.conversion_value || 0);
                        const performance = (q3Threshold > 0 && revenue >= q3Threshold) ? 'high' : 'low';
                        const percent = extractPercent(campaign.name);

                        const baseObj: any = {
                            id: campaign.id,
                            name: campaign.name,
                            channel: campaign.channel,
                            send_time: campaign.send_time,
                            status: campaign.status,
                            message_id: campaign.message_id,
                            audiences: campaign.audiences,
                            revenue: revenue,
                            performance: performance
                        };

                        // Add league only for tabs client
                        if (isTabsClient) {
                            baseObj.league = detectLeagues(campaign.name);
                        }

                        calendar[dateKey].campaignData.push(baseObj);

                        // Update aggregate
                        if (performance === 'high') {
                            calendar[dateKey].aggregate.high += revenue;
                            if (percent !== null) highPercents.push(percent);
                        } else {
                            calendar[dateKey].aggregate.low += revenue;
                            if (percent !== null) lowPercents.push(percent);
                        }
                    });

                    // Calculate average percents
                    calendar[dateKey].aggregate.highPercent = highPercents.length > 0
                        ? Number((highPercents.reduce((a, b) => a + b, 0) / highPercents.length).toFixed(2))
                        : 0;

                    calendar[dateKey].aggregate.lowPercent = lowPercents.length > 0
                        ? Number((lowPercents.reduce((a, b) => a + b, 0) / lowPercents.length).toFixed(2))
                        : 0;
                });

                // ✅ Format draft/proposal object (no revenue, no performance)
                const formatDraft = (item: any) => {
                    const baseObj: any = {
                        _id: item._id?.toString(),                      // ✅ ADD THIS LINE

                        id: item.campaign_id,
                        name: item.campaign_name,
                        channel: item.channel || null,
                        send_time: item.send_time ? item.send_time : null,
                        status: item.status,
                        message_id: item.message_id || null,
                        audiences: item.audiences || { included: {}, excluded: {} },
                        type: item.type,

                        // ✅ proposal fields (needed for autofill)
                        discountCode: item.discountCode || "",
                        startDate: item.startDate,
                        endDate: item.endDate,
                        whoIsDesigning: item.whoIsDesigning || "",
                        whoIsSending: item.whoIsSending || "",
                        clientProvidingAssets: !!item.clientProvidingAssets,
                        assetUrl: item.assetUrl || "",

                        content: {
                            promotion: item.content?.promotion || "",
                            themeSummary: item.content?.themeSummary || "",
                            productFeatures: item.content?.productFeatures || "",
                            landingPage: item.content?.landingPage || "",
                            additionalNotes: item.content?.additionalNotes || "",
                            description: item.content?.description || "",
                        },
                    };


                    // Add league only for tabs client
                    if (isTabsClient) {
                        baseObj.league = detectLeagues(item.campaign_name);
                    }

                    return baseObj;
                };

                // ✅ Add draft/proposal from MarketingCalendarModel
                const draftsAndProposals = await MarketingCalendarModel.find({
                    client_id: getMongoDbObjectId(clientId),
                    type: { $in: ['draft', 'proposal'] },
                }).lean();

                draftsAndProposals.forEach((item: any) => {
                    const dateKey = resolveAnyDateKey(item);
                    if (!dateKey) return;

                    calendar[dateKey].campaignData.push(formatDraft(item));
                });

                // ✅ Round aggregate values
                Object.keys(calendar).forEach(dateKey => {
                    calendar[dateKey].aggregate.high = Number(calendar[dateKey].aggregate.high.toFixed(2));
                    calendar[dateKey].aggregate.low = Number(calendar[dateKey].aggregate.low.toFixed(2));
                });

                return calendar;
            };


            const TABS_CLIENT_ID = '699c4124d2de1fc1c5be71c1';
            const isTabsClient = clientId === TABS_CLIENT_ID;

            // ✅ Fixed tabs for tabs client
            const tabs = isTabsClient ? ['all', 'mlb', 'nba', 'nfl', 'nhl'] : null;

            // ✅ Build calendars (single logic for both)
            const marketingCalendar = await buildDateWiseCalendar(currentStart, currentEnd, currentCampaigns, clientId, isTabsClient);
            const marketingCalendarMom = await buildDateWiseCalendar(momStart, momEnd, momCampaigns, clientId, isTabsClient);
            const marketingCalendarYoy = await buildDateWiseCalendar(yoyStart, yoyEnd, yoyCampaigns, clientId, isTabsClient);

            return res.status(200).json({
                success: true,
                statusCode: 200,
                message: 'Data fetched successfully',
                data: {
                    stats,
                    marketingCalendar,
                    marketingCalendarMom,
                    marketingCalendarYoy,
                    ...(isTabsClient && tabs && { tabs })
                }
            });

        } catch (error: any) {
            logger.error(error, 'Error in MarketingCalendarController.mondayCalenderList');
            return res.status(500).json({
                success: false,
                statusCode: 500,
                message: error.message || 'Internal server error',
            });
        }
    }

    static async createProposal(req: Request, res: Response) {
        try {
            const { clientId, connectionId, proposal } = req.body;

            if (!clientId) {
                return res.status(400).json({
                    success: false,
                    message: "clientId is required"
                });
            }

            if (!proposal?.name) {
                return res.status(400).json({
                    success: false,
                    message: "proposal name is required"
                });
            }

            // simple campaign id

            const doc = await MarketingCalendarModel.create({
                client_id: getMongoDbObjectId(clientId),
                connection_id: getMongoDbObjectId(connectionId),
                campaign_name: proposal.name,
                status: "pending",
                type: "proposal",

                send_time: null,
                archived: false,
                discountCode: proposal.discountCode || "",
                startDate: proposal.startDate || null,
                endDate: proposal.endDate || null,
                whoIsDesigning: proposal.whoIsDesigning || "",
                whoIsSending: proposal.whoIsSending || "",
                clientProvidingAssets: proposal.clientProvidingAssets || false,
                assetUrl: proposal.assetUrl || "",

                content: {
                    promotion: proposal.content?.promotion || "",
                    themeSummary: proposal.content?.themeSummary || "",
                    productFeatures: proposal.content?.productFeatures || "",
                    landingPage: proposal.content?.landingPage || "",
                    additionalNotes: proposal.content?.additionalNotes || "",
                    description: proposal.content?.description || ""
                },


                created_at: new Date(),
                updated_at: new Date()
            });

            return res.status(200).json({
                success: true,
                message: "Proposal created successfully",
                data: doc
            });

        } catch (error: any) {
            logger.error(error, 'Error in MarketingCalendarController.createProposal');

            return res.status(500).json({
                success: false,
                message: error.message || "Internal server error"
            });
        }
    }

    static async updateProposal(req: Request, res: Response) {
        try {
            const { proposalId, proposal } = req.body;

            if (!proposalId) {
                return res.status(400).json({
                    success: false,
                    message: "proposalId is required"
                });
            }

            const existing = await MarketingCalendarModel.findById(proposalId);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: "Proposal not found"
                });
            }

            if (existing.type !== "proposal") {
                return res.status(400).json({
                    success: false,
                    message: "Only proposals can be edited"
                });
            }

            const updated = await MarketingCalendarModel.findByIdAndUpdate(
                proposalId,
                {
                    $set: {
                        campaign_name: proposal.name,
                        discountCode: proposal.discountCode || "",
                        startDate: proposal.startDate || null,
                        endDate: proposal.endDate || null,
                        whoIsDesigning: proposal.whoIsDesigning || "",
                        whoIsSending: proposal.whoIsSending || "",
                        clientProvidingAssets: proposal.clientProvidingAssets || false,
                        assetUrl: proposal.assetUrl || "",
                        content: {
                            promotion: proposal.content?.promotion || "",
                            themeSummary: proposal.content?.themeSummary || "",
                            productFeatures: proposal.content?.productFeatures || "",
                            landingPage: proposal.content?.landingPage || "",
                            additionalNotes: proposal.content?.additionalNotes || "",
                            description: proposal.content?.description || ""
                        },
                        updated_at: new Date()
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Proposal updated successfully",
                data: updated
            });

        } catch (error: any) {
            logger.error(error, 'Error in MarketingCalendarController.updateProposal');

            return res.status(500).json({
                success: false,
                message: error.message || "Internal server error"
            });
        }
    }
}