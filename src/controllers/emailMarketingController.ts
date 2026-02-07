import { Request, Response } from 'express';
import mongoose from 'mongoose';
import moment from 'moment';
import { getCentralStorageModel } from '../db/schema/dynamic-central-model';
import ClientConnections from '../db/models/clientConnections';
import logger from '../utils/logger';

interface IEmailMarketingPayload {
    clientId: string;
    startDate: string;
    endDate: string;
    compareStartDate?: string;
    compareEndDate?: string;
}

interface ICampaignPayload {
    clientId: string;
    startDate: string;
    endDate: string;
}

const getYearsInRange = (start: moment.Moment, end: moment.Moment): number[] => {
    const years: number[] = [];
    for (let y = start.year(); y <= end.year(); y++) years.push(y);
    return years;
};

const queryCentralStorage = async (
    clientId: string,
    network: string,
    startDate: moment.Moment,
    endDate: moment.Moment,
    matchExtra: Record<string, any> = {}
) => {
    const objectId = new mongoose.Types.ObjectId(clientId);
    const years = getYearsInRange(startDate, endDate);

    const results = await Promise.all(
        years.map(async (year) => {
            const qStart = moment.max(startDate, moment().year(year).startOf('year'));
            const qEnd = moment.min(endDate, moment().year(year).endOf('year'));
            if (qStart.isAfter(qEnd)) return [];

            const CentralStorage = getCentralStorageModel(`central_storage_${year}`);
            return CentralStorage.find({
                client_id: objectId,
                network,
                date: {
                    $gte: qStart.startOf('day').toDate(),
                    $lte: qEnd.endOf('day').toDate(),
                },
                ...matchExtra,
            }).lean();
        })
    );

    return results.flat();
};

const queryKlaviyoRecords = async (
    clientId: string,
    startDate: moment.Moment,
    endDate: moment.Moment
) => {
    return queryCentralStorage(clientId, 'klaviyo', startDate, endDate);
};

const computeRevenueSummary = (records: any[]) => {
    let emailRevenue = 0;
    let flowRevenue = 0;
    let smsRevenue = 0;

    for (const record of records) {
        const data = record.data || {};
        const type = (data.type || '').toLowerCase();
        const channel = (data.channel || '').toLowerCase();
        const conversionValue = Number(data.statistics?.conversion_value || 0);

        if (type === 'campaign' && channel !== 'sms') {
            emailRevenue += conversionValue;
        }

        if (type === 'flow') {
            flowRevenue += conversionValue;
        }

        if (type === 'campaign' && channel !== 'campaign') {
            smsRevenue += conversionValue;
        }
    }

    return {
        email_revenue: Number(emailRevenue.toFixed(2)),
        flow_revenue: Number(flowRevenue.toFixed(2)),
        sms_mms_revenue: Number(smsRevenue.toFixed(2)),
    };
};

const computeShopifyRevenue = async (
    clientId: string,
    startDate: moment.Moment,
    endDate: moment.Moment
): Promise<number> => {
    const objectId = new mongoose.Types.ObjectId(clientId);
    const years = getYearsInRange(startDate, endDate);

    let totalRevenue = 0;

    await Promise.all(
        years.map(async (year) => {
            const qStart = moment.max(startDate, moment().year(year).startOf('year'));
            const qEnd = moment.min(endDate, moment().year(year).endOf('year'));
            if (qStart.isAfter(qEnd)) return;

            const CentralStorage = getCentralStorageModel(`central_storage_${year}`);
            const result = await CentralStorage.aggregate([
                {
                    $match: {
                        client_id: objectId,
                        network: 'shopify',
                        date: {
                            $gte: qStart.startOf('day').toDate(),
                            $lte: qEnd.endOf('day').toDate(),
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $subtract: [
                                    {
                                        $add: [
                                            { $ifNull: ['$data.gross_sales', 0] },
                                            { $ifNull: ['$data.shipping_charges', 0] },
                                            { $ifNull: ['$data.taxes', 0] },
                                        ],
                                    },
                                    { $abs: { $ifNull: ['$data.discounts', 0] } },
                                ],
                            },
                        },
                    },
                },
            ]);

            if (result.length > 0) {
                totalRevenue += result[0].total;
            }
        })
    );

    return Number(totalRevenue.toFixed(2));
};

const getLastUpdated = (records: any[]): string | null => {
    if (!records.length) return null;
    let latest: Date | null = null;
    for (const r of records) {
        const updatedAt = r.updatedAt ? new Date(r.updatedAt) : null;
        if (updatedAt && (!latest || updatedAt > latest)) {
            latest = updatedAt;
        }
    }
    return latest ? latest.toISOString() : null;
};

export const getEmailMarketingSummary = async (req: Request, res: Response) => {
    try {
        const {
            clientId,
            startDate,
            endDate,
            compareStartDate,
            compareEndDate,
        }: IEmailMarketingPayload = req.body;

        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'clientId, startDate, and endDate are required.',
                data: null,
            });
        }

        const currentStart = moment(startDate);
        const currentEnd = moment(endDate);

        let prevStart: moment.Moment;
        let prevEnd: moment.Moment;

        if (compareStartDate && compareEndDate) {
            prevStart = moment(compareStartDate);
            prevEnd = moment(compareEndDate);
        } else {
            const duration = currentEnd.diff(currentStart, 'days') + 1;
            prevStart = moment(currentStart).subtract(duration, 'days');
            prevEnd = moment(currentEnd).subtract(duration, 'days');
        }

        const [
            currentRecords,
            prevRecords,
            currentShopifyRevenue,
            prevShopifyRevenue,
        ] = await Promise.all([
            queryKlaviyoRecords(clientId, currentStart, currentEnd),
            queryKlaviyoRecords(clientId, prevStart, prevEnd),
            computeShopifyRevenue(clientId, currentStart, currentEnd),
            computeShopifyRevenue(clientId, prevStart, prevEnd),
        ]);

        const currentRevenue = computeRevenueSummary(currentRecords);
        const prevRevenue = computeRevenueSummary(prevRecords);
        const lastUpdated = getLastUpdated(currentRecords);

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Email marketing summary fetched successfully.',
            data: {
                last_updated: lastUpdated,
                date_range: {
                    start_date: startDate,
                    end_date: endDate,
                },
                comparison_date_range: {
                    start_date: prevStart.format('YYYY-MM-DD'),
                    end_date: prevEnd.format('YYYY-MM-DD'),
                },
                total_revenue: {
                    current: currentShopifyRevenue,
                    previous: prevShopifyRevenue,
                },
                email_revenue: {
                    current: currentRevenue.email_revenue,
                    previous: prevRevenue.email_revenue,
                },
                flow_revenue: {
                    current: currentRevenue.flow_revenue,
                    previous: prevRevenue.flow_revenue,
                },
                sms_mms_revenue: {
                    current: currentRevenue.sms_mms_revenue,
                    previous: prevRevenue.sms_mms_revenue,
                },
            },
        });
    } catch (error: any) {
        logger.error(error, 'Email marketing summary error:');
        return res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Internal server error',
            data: null,
        });
    }
};

export const getEmailMarketingCampaigns = async (req: Request, res: Response) => {
    try {
        const { clientId, startDate, endDate }: ICampaignPayload = req.body;

        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'clientId, startDate, and endDate are required.',
                data: null,
            });
        }

        const currentStart = moment(startDate);
        const currentEnd = moment(endDate);

        const records = await queryKlaviyoRecords(clientId, currentStart, currentEnd);

        const campaignRecords = records.filter((r: any) => {
            const type = (r.data?.type || '').toLowerCase();
            return type === 'campaign';
        });

        let totalOpenRate = 0;
        let totalClickRate = 0;
        let totalRecipients = 0;
        let totalEmails = 0;
        let totalUnsubscribes = 0;
        let campaignCount = 0;

        const campaigns: any[] = [];

        for (const record of campaignRecords) {
            const data = record.data || {};
            const stats = data.statistics || {};

            const openRate = Number(stats.open_rate || 0);
            const clickRate = Number(stats.click_rate || 0);
            const recipients = Number(stats.recipients || 0);
            const delivered = Number(stats.delivered || 0);
            const bounced = Number(stats.bounced || 0);
            const unsubscribes = Number(stats.unsubscribes || 0);
            const emails = delivered + bounced;

            totalOpenRate += openRate;
            totalClickRate += clickRate;
            totalRecipients += recipients;
            totalEmails += emails;
            totalUnsubscribes += unsubscribes;
            campaignCount++;

            campaigns.push({
                date: record.date,
                name: data.name || data.campaign_name || '',
                channel: data.channel || '',
                subject: data.subject || '',
                statistics: {
                    open_rate: Number(openRate.toFixed(2)),
                    click_rate: Number(clickRate.toFixed(2)),
                    recipients,
                    delivered,
                    bounced,
                    emails,
                    unsubscribes,
                    conversion_value: Number(stats.conversion_value || 0),
                },
            });
        }

        const avgOpenRate = campaignCount > 0 ? Number((totalOpenRate / campaignCount).toFixed(2)) : 0;
        const avgClickRate = campaignCount > 0 ? Number((totalClickRate / campaignCount).toFixed(2)) : 0;

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Email marketing campaigns fetched successfully.',
            data: {
                summary: {
                    open_rate: avgOpenRate,
                    click_rate: avgClickRate,
                    total_recipients: totalRecipients,
                    total_emails: totalEmails,
                    total_unsubscribes: totalUnsubscribes,
                    campaign_count: campaignCount,
                },
                campaigns,
            },
        });
    } catch (error: any) {
        logger.error(error, 'Email marketing campaigns error:');
        return res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Internal server error',
            data: null,
        });
    }
};

export const getEmailMarketingBenchmarks = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.body;

        if (!clientId) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'clientId is required.',
                data: null,
            });
        }

        const now = moment();

        const periods = [
            { label: '2_months', months: 2 },
            { label: '6_months', months: 6 },
            { label: '12_months', months: 12 },
        ];

        const benchmarks: Record<string, any> = {};

        await Promise.all(
            periods.map(async (period) => {
                const periodStart = moment(now).subtract(period.months, 'months');
                const periodEnd = moment(now).subtract(1, 'day');
                const numberOfDays = periodEnd.diff(periodStart, 'days') + 1;

                const records = await queryKlaviyoRecords(clientId, periodStart, periodEnd);

                const campaignRecords = records.filter((r: any) => {
                    const type = (r.data?.type || '').toLowerCase();
                    return type === 'campaign';
                });

                let totalDelivered = 0;
                let totalOpensUnique = 0;
                let totalClicksUnique = 0;

                for (const record of campaignRecords) {
                    const stats = record.data?.statistics || {};
                    totalDelivered += Number(stats.delivered || 0);
                    totalOpensUnique += Number(stats.opens_unique || 0);
                    totalClicksUnique += Number(stats.clicks_unique || 0);
                }

                const avgDelivered = numberOfDays > 0 ? totalDelivered / numberOfDays : 0;
                const avgUniqueOpenEmail = numberOfDays > 0 ? totalOpensUnique / numberOfDays : 0;
                const avgUniqueClicks = numberOfDays > 0 ? totalClicksUnique / numberOfDays : 0;
                const openRate = avgDelivered > 0 ? (avgUniqueOpenEmail / avgDelivered) * 100 : 0;
                const clickRate = avgDelivered > 0 ? (avgUniqueClicks / avgDelivered) * 100 : 0;

                benchmarks[period.label] = {
                    period_days: numberOfDays,
                    total_delivered: totalDelivered,
                    total_opens_unique: totalOpensUnique,
                    total_clicks_unique: totalClicksUnique,
                    avg_delivered: Number(avgDelivered.toFixed(2)),
                    avg_unique_open_email: Number(avgUniqueOpenEmail.toFixed(2)),
                    avg_unique_clicks: Number(avgUniqueClicks.toFixed(2)),
                    open_rate: Number(openRate.toFixed(2)),
                    click_rate: Number(clickRate.toFixed(2)),
                };
            })
        );

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Email marketing benchmarks fetched successfully.',
            data: benchmarks,
        });
    } catch (error: any) {
        logger.error(error, 'Email marketing benchmarks error:');
        return res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Internal server error',
            data: null,
        });
    }
};

export const getEmailMarketingFlows = async (req: Request, res: Response) => {
    try {
        const { clientId, startDate, endDate }: ICampaignPayload = req.body;

        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'clientId, startDate, and endDate are required.',
                data: null,
            });
        }

        const currentStart = moment(startDate);
        const currentEnd = moment(endDate);

        const records = await queryKlaviyoRecords(clientId, currentStart, currentEnd);

        const flowRecords = records.filter((r: any) => {
            const type = (r.data?.type || '').toLowerCase();
            return type === 'flow';
        });

        let totalConversionValue = 0;
        let totalRecipients = 0;
        let totalDelivered = 0;
        let totalOpensUnique = 0;
        let totalClicksUnique = 0;
        let totalUnsubscribes = 0;

        const flows: any[] = [];

        for (const record of flowRecords) {
            const data = record.data || {};
            const stats = data.statistics || {};

            const conversionValue = Number(stats.conversion_value || 0);
            const recipients = Number(stats.recipients || 0);
            const delivered = Number(stats.delivered || 0);
            const opensUnique = Number(stats.opens_unique || 0);
            const clicksUnique = Number(stats.clicks_unique || 0);
            const unsubscribes = Number(stats.unsubscribes || 0);

            totalConversionValue += conversionValue;
            totalRecipients += recipients;
            totalDelivered += delivered;
            totalOpensUnique += opensUnique;
            totalClicksUnique += clicksUnique;
            totalUnsubscribes += unsubscribes;

            flows.push({
                date: record.date,
                name: data.name || data.flow_name || '',
                statistics: {
                    conversion_value: Number(conversionValue.toFixed(2)),
                    recipients,
                    delivered,
                    opens_unique: opensUnique,
                    clicks_unique: clicksUnique,
                    unsubscribes,
                    open_rate: delivered > 0 ? Number(((opensUnique / delivered) * 100).toFixed(2)) : 0,
                    click_rate: delivered > 0 ? Number(((clicksUnique / delivered) * 100).toFixed(2)) : 0,
                },
            });
        }

        const overallOpenRate = totalDelivered > 0 ? Number(((totalOpensUnique / totalDelivered) * 100).toFixed(2)) : 0;
        const overallClickRate = totalDelivered > 0 ? Number(((totalClicksUnique / totalDelivered) * 100).toFixed(2)) : 0;

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Email marketing flows fetched successfully.',
            data: {
                summary: {
                    total_conversion_value: Number(totalConversionValue.toFixed(2)),
                    total_recipients: totalRecipients,
                    total_delivered: totalDelivered,
                    total_opens_unique: totalOpensUnique,
                    total_clicks_unique: totalClicksUnique,
                    total_unsubscribes: totalUnsubscribes,
                    open_rate: overallOpenRate,
                    click_rate: overallClickRate,
                },
                flows,
            },
        });
    } catch (error: any) {
        logger.error(error, 'Email marketing flows error:');
        return res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Internal server error',
            data: null,
        });
    }
};
