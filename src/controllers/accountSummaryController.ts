import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AccountSummary from '../db/models/AccountSummary';
import ProjectionGoals from '../db/models/projectionGoals';
import ClientConnections from '../db/models/clientConnections';
import Integrations from '../db/models/integrations';
import HideClient from '../db/models/hideClient';
import moment from 'moment';
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";
import { CriteoService } from "../liberaries/PaidMedia/Criteo/CriteoLib";
import { analyticsDataService } from '../liberaries/PaidMedia/GA4/analyticsDataLib';
import { getCentralStorageModel } from '../db/schema/dynamic-central-model';
import { PLATFORM_CONFIG } from '../utils/platformConstants';
import { formatLiveDataByPlatform } from '../helper/dataFormatters';
import { Aggregation, buildPlatformChartData } from '../helper/chartBuilder';
import { calculateAggregatedShopifyRevenue, calculateStatsFromTimeseries } from '../helper/metricsHelper';
import { fetchAllActiveClients, fetchClientById } from '../helper/utilityHelper';
import { runHourlySummaryOptimized } from '../services/accountSummaryService';
import pLimit from 'p-limit';
import { ShopifyService } from '../liberaries/PaidMedia/Shopify/shopify-service';


// Simple in-memory cache for live API calls
const LIVE_API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const liveApiCache = new Map<string, { data: any; ts: number }>();

const getLiveCache = (key: string) => {
    const entry = liveApiCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > LIVE_API_CACHE_TTL) {
        liveApiCache.delete(key);
        return null;
    }
    return entry.data;
};

const setLiveCache = (key: string, data: any) => {
    liveApiCache.set(key, { data, ts: Date.now() });
};


const extractMetricsFromRaw = (raw: any) => {
    const shopify = raw?.shopify || {};
    const ga = raw?.ga || {};
    const meta = raw?.meta || {};
    const adword = raw?.adword || {};

    return {
        // Shopify
        shopify_sessions: Number(shopify.sessions || 0),

        // GA
        ga_revenue: Number(
            ga.channels?.reduce((sum: number, ch: any) => sum + Number(ch.totalRevenue || 0), 0) ||
            ga.revenue || 0
        ),
        ga_sessions: Number(
            ga.channels?.reduce((sum: number, ch: any) => sum + Number(ch.sessions || 0), 0) ||
            ga.sessions || 0
        ),

        // Meta
        meta_spend: Number(meta.spend || 0),
        meta_clicks: Number(meta.outbound_clicks || meta.clicks || 0),
        meta_revenue: Number(meta.revenue || 0),
        meta_impressions: Number(meta.impressions || 0),

        // Adword
        adword_spend: Number(adword.spend || adword.cost || 0),
        adword_clicks: Number(adword.clicks || 0),
        adword_revenue: Number(adword.revenue || 0),
        adword_impressions: Number(adword.impressions || 0),
    };
};



interface IAccountSummaryPayload {
    userId?: string;
    startDate: string;
    endDate: string;
    comparison?: 'yesterday_same_hour' | 'previous_period';
    compareStartDate?: string;
    compareEndDate?: string;
    aggregation?: Aggregation;
}

interface IAggregationResult {
    _id: string;
    revenue: number;
    spend: number;
    sessions: number;
    total_clicks: number;

    shopify_revenue: number;
    shopify_sessions: number;

    ga_revenue: number;
    ga_sessions: number;

    meta_spend: number;
    meta_clicks: number;
    meta_revenue: number;

    google_spend: number;
    google_clicks: number;
    google_revenue: number;

    criteo_spend: number;
    criteo_revenue: number;

    last_updated?: Date;
}

const fillTimeseriesGaps = (
    series: Record<string, any>,
    s: moment.Moment,
    e: moment.Moment,
    platformId?: string
): Record<string, any> => {
    const out: Record<string, any> = {};
    const cursor = moment(s).startOf('day');
    const last = moment(e).startOf('day');

    const getZeroPoint = (platform?: string): Record<string, any> => {
        const id = (platform || '').toLowerCase();

        if (id === 'shopify') {
            return {
                revenue: 0, sessions: 0, orders: 0, gross_sales: 0,
                discounts: 0, returns: 0, net_sales: 0, shipping_charges: 0,
                taxes: 0, total_sales: 0, quantity_ordered: 0, customers: 0,
                new_customers: 0, returning_customers: 0, online_store_visitors: 0,
                conversion_rate: 0, avg_order_value: 0
            };
        }

        if (id === 'meta') {
            return {
                spend: 0, revenue: 0, clicks: 0, outbound_clicks: 0,
                impressions: 0, cpc: 0, ctr: 0, roas: 0, conversions: 0
            };
        }

        if (id === 'adword') {
            return {
                spend: 0, revenue: 0, clicks: 0, impressions: 0,
                cpc: 0, ctr: 0, roas: 0, conversions: 0
            };
        }

        if (id === 'ga') {
            return {
                revenue: 0, sessions: 0, transactions: 0, itemsPurchased: 0,
                newUsers: 0, bounceRate: 0, averageSessionDuration: 0,
                userEngagementDuration: 0, screenPageViewsPerSession: 0, conversionRate: 0
            };
        }

        return {
            outbound_clicks: 0, clicks: 0, impressions: 0, spend: 0,
            revenue: 0, sessions: 0, orders: 0, cpc: 0, ctr: 0, roas: 0
        };
    };

    const zeroPoint = getZeroPoint(platformId);

    while (cursor.isSameOrBefore(last)) {
        const key = cursor.format('YYYY-MM-DD');
        const existingData = series[key] || {};
        out[key] = { ...zeroPoint, ...existingData };
        cursor.add(1, 'day');
    }
    return out;
};

const aggregateToHourly = (timeseries: Record<string, any>): Record<string, any> => {
    const hourlyMap: Record<string, any> = {};

    Object.entries(timeseries).forEach(([key, data]) => {
        if (!data || data.error) return;

        let hourKey: string;
        if (key.includes(' ')) {
            const [datePart, timePart] = key.split(' ');
            const hour = timePart.split(':')[0];
            hourKey = `${datePart} ${hour}:00`;
        } else {
            hourKey = key;
        }

        if (!hourlyMap[hourKey]) {
            hourlyMap[hourKey] = {
                outbound_clicks: 0, clicks: 0, impressions: 0, spend: 0,
                revenue: 0, sessions: 0, conversions: 0, orders: 0,
                transactions: 0, itemsPurchased: 0, cpc: 0, ctr: 0, roas: 0
            };
        }

        hourlyMap[hourKey].outbound_clicks += (data.outbound_clicks || 0);
        hourlyMap[hourKey].clicks += (data.clicks || 0);
        hourlyMap[hourKey].impressions += (data.impressions || 0);
        hourlyMap[hourKey].spend += (data.spend || 0);
        hourlyMap[hourKey].revenue += (data.revenue || 0);
        hourlyMap[hourKey].sessions += (data.sessions || 0);
        hourlyMap[hourKey].conversions += (data.conversions || 0);
        hourlyMap[hourKey].orders += (data.orders || 0);
        hourlyMap[hourKey].transactions += (data.transactions || 0);
        hourlyMap[hourKey].itemsPurchased += (data.itemsPurchased || 0);
    });

    Object.keys(hourlyMap).forEach(key => {
        const d = hourlyMap[key];
        d.cpc = d.clicks > 0 ? Number((d.spend / d.clicks).toFixed(2)) : 0;
        d.ctr = d.impressions > 0 ? Number(((d.clicks / d.impressions) * 100).toFixed(2)) : 0;
        d.roas = d.spend > 0 ? Number((d.revenue / d.spend).toFixed(2)) : 0;
        d.spend = Number(d.spend.toFixed(2));
        d.revenue = Number(d.revenue.toFixed(2));
    });

    return hourlyMap;
};

const PLATFORM_TIMESERIES_FIELDS: Record<string, string[]> = {
    meta: ['spend', 'revenue', 'clicks', 'outbound_clicks', 'impressions', 'cpc', 'ctr', 'roas', 'reach', 'cpm'],
    adword: ['spend', 'revenue', 'clicks', 'impressions', 'cpc', 'ctr', 'roas', 'quality_score'],
    ga: ['revenue', 'sessions', 'transactions', 'itemsPurchased', 'newUsers', 'bounceRate', 'averageSessionDuration', 'userEngagementDuration', 'screenPageViewsPerSession', 'conversionRate'],
    shopify: ['revenue', 'sessions', 'orders', 'gross_sales', 'discounts', 'returns', 'net_sales', 'shipping_charges', 'taxes', 'total_sales', 'quantity_ordered', 'customers', 'new_customers', 'returning_customers', 'online_store_visitors', 'conversion_rate', 'avg_order_value'],
    all_channels: ['spend', 'revenue', 'clicks', 'outbound_clicks', 'impressions', 'sessions', 'orders', 'cpc', 'ctr', 'roas']
};

const cleanTimeseriesByPlatform = (
    timeseries: Record<string, any>,
    platformId: string
): Record<string, any> => {
    const allowedFields = PLATFORM_TIMESERIES_FIELDS[platformId.toLowerCase()];
    if (!allowedFields) return timeseries;

    const cleaned: Record<string, any> = {};
    Object.entries(timeseries).forEach(([dateKey, data]) => {
        if (!data || data.error) {
            cleaned[dateKey] = data;
            return;
        }

        const cleanedData: Record<string, any> = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                cleanedData[field] = data[field];
            }
        });
        cleaned[dateKey] = cleanedData;
    });

    return cleaned;
};

export const getAccountSummary = async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
        const { startDate, endDate, comparison, aggregation, compareStartDate, compareEndDate }: IAccountSummaryPayload = req.body;

        const includeLive = String((req.query as any)?.include_live ?? (req.body as any)?.include_live ?? 'false').toLowerCase() === 'true';

        // 1. Date Logic
        const currentStart = moment(startDate);
        const currentEnd = moment(endDate);

        const MAX_HOURLY_DAYS = 2;
        const daySpan = currentEnd.diff(currentStart, 'days') + 1;
        const centralOnlyForRange = daySpan > MAX_HOURLY_DAYS;

        const requestedAggregation = typeof aggregation === 'string' && ['day', 'hour'].includes(aggregation.toLowerCase())
            ? aggregation.toLowerCase() as Aggregation
            : undefined;

        const allowLiveHourly = includeLive && !centralOnlyForRange;

        let prevStart: moment.Moment, prevEnd: moment.Moment;

        if (compareStartDate && compareEndDate) {
            // Prioritize custom comparison dates
            prevStart = moment(compareStartDate);
            prevEnd = moment(compareEndDate);
        } else if (comparison === 'yesterday_same_hour') {
            prevStart = moment(currentStart).subtract(1, 'days');
            prevEnd = moment(currentEnd).subtract(1, 'days');
        } else if (comparison === 'previous_period') {
            const duration = currentEnd.diff(currentStart, 'days') + 1;
            prevStart = moment(currentStart).subtract(duration, 'days');
            prevEnd = moment(currentEnd).subtract(duration, 'days');
        } else {
            // Default fallbacks if no custom dates and no recognized enum
            prevStart = moment(currentStart).subtract(1, 'days');
            prevEnd = moment(currentEnd).subtract(1, 'days');
        }

        // 2. Clients
        let visibleClients;
        const reqClientId = req.params.clientId;

        if (reqClientId) {
            const singleClient = await fetchClientById(reqClientId);
            if (!singleClient) {
                return res.status(404).json({ success: false, message: 'Client not found' });
            }
            visibleClients = [singleClient];
        } else {
            visibleClients = await fetchAllActiveClients();
        }

        const visibleClientIds = visibleClients.map(c => c._id.toString());
        const objectIds = visibleClientIds.map(id => new mongoose.Types.ObjectId(id));

        // -----------------------------------------------------------
        // UPDATED: fetchMetrics with new raw structure
        // -----------------------------------------------------------
        const fetchMetrics = async (
            s: moment.Moment,
            e: moment.Moment,
            clientIds: string[],
            opts: { centralOnly?: boolean } = {}
        ): Promise<IAggregationResult[]> => {
            const useCentralOnly = !!opts.centralOnly;
            const objectIds = clientIds.map(id => new mongoose.Types.ObjectId(id));
            const yesterdayStart = moment.utc().subtract(1, 'days').startOf('day');

            const histEnd = useCentralOnly
                ? e
                : moment.min(e, moment(yesterdayStart).subtract(1, 'ms'));

            const hasHistorical = s.isSameOrBefore(histEnd);
            const recentStart = moment.max(s, yesterdayStart);
            const hasRecent = !useCentralOnly && e.isSameOrAfter(yesterdayStart);

            let historicalData: any[] = [];
            let recentData: any[] = [];

            // A. Central Storage (Historical)
            if (hasHistorical) {
                const startYear = s.year();
                const endYear = histEnd.year();
                const years: number[] = [];
                for (let y = startYear; y <= endYear; y++) years.push(y);

                const yearlyResults = await Promise.all(years.map(async (year) => {
                    const yearStart = moment().year(year).startOf('year');
                    const yearEnd = moment().year(year).endOf('year');

                    const qStart = moment.max(s, yearStart);
                    const qEnd = moment.min(histEnd, yearEnd);

                    if (qStart.isAfter(qEnd)) return [];

                    const collectionName = `central_storage_${year}`;
                    const CentralStorage = getCentralStorageModel(collectionName);

                    return CentralStorage.aggregate([
                        {
                            $match: {
                                client_id: { $in: objectIds },
                                date: {
                                    $gte: moment(qStart).startOf("day").toDate(),
                                    $lte: moment(qEnd).endOf("day").toDate()
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$client_id",

                                shopify_revenue: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$network", "shopify"] },
                                            {
                                                // Formula: G - D + S + T
                                                // Use $abs to ensure D is always positive before subtracting
                                                $subtract: [
                                                    {
                                                        $add: [
                                                            { $ifNull: ["$data.gross_sales", 0] },
                                                            { $ifNull: ["$data.shipping_charges", 0] },
                                                            { $ifNull: ["$data.taxes", 0] }
                                                        ]
                                                    },
                                                    {
                                                        $abs: { $ifNull: ["$data.discounts", 0] }
                                                    }
                                                ]
                                            },
                                            0
                                        ]
                                    }
                                },

                                revenue: {
                                    $sum: {
                                        $cond: [
                                            { $in: ["$network", ["shopify", "ga"]] },
                                            { $ifNull: ["$data.revenue", { $ifNull: ["$data.totalRevenue", 0] }] },
                                            { $cond: [{ $in: ["$network", ["meta", "adword"]] }, "$data.revenue", 0] }
                                        ]
                                    }
                                },
                                spend: { $sum: { $ifNull: ["$data.spend", 0] } },
                                sessions: { $sum: { $ifNull: ["$data.sessions", 0] } },
                                total_clicks: { $sum: { $ifNull: ["$data.clicks", { $ifNull: ["$data.outbound_clicks", 0] }] } },

                                shopify_sessions: { $sum: { $cond: [{ $eq: ["$network", "shopify"] }, "$data.sessions", 0] } },

                                ga_revenue: { $sum: { $cond: [{ $eq: ["$network", "ga"] }, { $ifNull: ["$data.totalRevenue", "$data.revenue"] }, 0] } },
                                ga_sessions: { $sum: { $cond: [{ $eq: ["$network", "ga"] }, "$data.sessions", 0] } },

                                meta_spend: { $sum: { $cond: [{ $eq: ["$network", "meta"] }, "$data.spend", 0] } },
                                meta_clicks: { $sum: { $cond: [{ $eq: ["$network", "meta"] }, { $ifNull: ["$data.outbound_clicks", "$data.clicks"] }, 0] } },
                                meta_revenue: { $sum: { $cond: [{ $eq: ["$network", "meta"] }, "$data.revenue", 0] } },

                                google_spend: { $sum: { $cond: [{ $eq: ["$network", "adword"] }, "$data.spend", 0] } },
                                google_clicks: { $sum: { $cond: [{ $eq: ["$network", "adword"] }, "$data.clicks", 0] } },
                                google_revenue: { $sum: { $cond: [{ $eq: ["$network", "adword"] }, "$data.revenue", 0] } },

                                criteo_spend: { $sum: { $cond: [{ $eq: ["$network", "criteo"] }, "$data.spend", 0] } },
                                criteo_revenue: { $sum: { $cond: [{ $eq: ["$network", "criteo"] }, "$data.revenue", 0] } },

                                last_updated: { $max: { $ifNull: ["$updated_at", "$createdAt", "$date"] } }
                            }
                        }
                    ]);
                }));
                historicalData = yearlyResults.flat();
            }

            // B. Recent (AccountSummary) - ✅ UPDATED FOR NEW RAW STRUCTURE
            if (hasRecent) {
                const recentDocs = await AccountSummary.find({
                    client_id: { $in: objectIds },
                    date: {
                        $gte: recentStart.format("YYYY-MM-DD"),
                        $lte: e.format("YYYY-MM-DD") + " 23:59"
                    }
                }).lean();

                // Group by client and aggregate
                const clientAggMap = new Map<string, any>();

                recentDocs.forEach((doc: any) => {
                    const cid = doc.client_id.toString();
                    const metrics = extractMetricsFromRaw(doc.raw);

                    if (!clientAggMap.has(cid)) {
                        clientAggMap.set(cid, {
                            _id: doc.client_id,
                            revenue: 0,          // optional, but rakho
                            spend: 0,
                            sessions: 0,
                            total_clicks: 0,
                            shopify_sessions: 0,
                            shopify_revenue: 0,
                            ga_revenue: 0,
                            ga_sessions: 0,
                            meta_spend: 0,
                            meta_clicks: 0,
                            meta_revenue: 0,
                            google_spend: 0,
                            google_clicks: 0,
                            google_revenue: 0,
                            criteo_spend: 0,
                            criteo_revenue: 0,
                            last_updated: null
                        });
                    }

                    const agg = clientAggMap.get(cid);

                    // Shopify revenue from raw.shopify (G-D+S+T)
                    const shopifyRaw = doc.raw?.shopify || null;
                    let shopifyRevenue = 0;
                    if (shopifyRaw) {
                        const G = Number(shopifyRaw.gross_sales || 0);
                        const D = Math.abs(Number(shopifyRaw.discounts || 0));  // ✅ Always positive
                        const S = Number(shopifyRaw.shipping_charges || 0);
                        const T = Number(shopifyRaw.taxes || 0);
                        shopifyRevenue = G - D + S + T;

                        // if (G > 0 || D > 0) {  // Only log if there's actual data
                        //     console.log(`💵 Shopify Revenue Calc [${doc.client_id}]:`, {
                        //         date: doc.date,
                        //         raw_discount: shopifyRaw.discounts,
                        //         G, D, S, T,
                        //         formula: `${G} - ${D} + ${S} + ${T}`,
                        //         result: shopifyRevenue
                        //     });
                        // }
                    }

                    // Spend/clicks from Meta+Adword
                    const thisSpend = metrics.meta_spend + metrics.adword_spend;
                    const thisClicks = metrics.meta_clicks + metrics.adword_clicks;

                    agg.spend += thisSpend;
                    agg.total_clicks += thisClicks;

                    // Sessions: prefer Shopify > GA
                    agg.sessions += metrics.shopify_sessions > 0
                        ? metrics.shopify_sessions
                        : metrics.ga_sessions;

                    // Split revenue fields
                    agg.shopify_revenue += shopifyRevenue;
                    agg.shopify_sessions += metrics.shopify_sessions;
                    agg.ga_revenue += metrics.ga_revenue;
                    agg.ga_sessions += metrics.ga_sessions;
                    agg.meta_spend += metrics.meta_spend;
                    agg.meta_clicks += metrics.meta_clicks;
                    agg.meta_revenue += metrics.meta_revenue;
                    agg.google_spend += metrics.adword_spend;
                    agg.google_clicks += metrics.adword_clicks;
                    agg.google_revenue += metrics.adword_revenue;

                    // (Optional) if you still want a generic agg.revenue:
                    // agg.revenue += shopifyRevenue || metrics.ga_revenue || (metrics.meta_revenue + metrics.adword_revenue);

                    if (doc.updated_at) {
                        if (!agg.last_updated || new Date(doc.updated_at) > new Date(agg.last_updated)) {
                            agg.last_updated = doc.updated_at;
                        }
                    }
                });

                recentData = Array.from(clientAggMap.values());
            }

            // C. Merge Historical + Recent
            const mergedMap = new Map<string, any>();
            const addToMap = (dataArr: any[]) => {
                dataArr.forEach(item => {
                    const cid = item._id.toString();
                    if (!mergedMap.has(cid)) {
                        mergedMap.set(cid, { ...item });
                    } else {
                        const existing = mergedMap.get(cid);
                        [
                            'revenue', 'spend', 'sessions', 'total_clicks', 'shopify_sessions',
                            'ga_revenue', 'ga_sessions',
                            'meta_spend', 'meta_clicks', 'meta_revenue',
                            'google_spend', 'google_clicks', 'google_revenue',
                            'criteo_spend', 'criteo_revenue',
                            'shopify_revenue'
                        ].forEach(field => {
                            existing[field] = (existing[field] || 0) + (item[field] || 0);
                        });
                        if (item.last_updated) {
                            if (!existing.last_updated || new Date(item.last_updated) > new Date(existing.last_updated)) {
                                existing.last_updated = item.last_updated;
                            }
                        }
                    }
                });
            };
            addToMap(historicalData);
            addToMap(recentData);

            return Array.from(mergedMap.values()) as IAggregationResult[];
        };

        // -----------------------------------------------------------
        // UPDATED: fetchRawHistory with new raw structure
        // -----------------------------------------------------------
        const fetchRawHistory = async (
            s: moment.Moment,
            e: moment.Moment,
            clientIds: string[],
            opts: { centralOnly?: boolean } = {}
        ) => {
            const objectIds = clientIds.map(id => new mongoose.Types.ObjectId(id));
            const yesterdayStart = moment.utc().subtract(1, 'days').startOf('day');
            const useCentralOnly = !!opts.centralOnly;

            const histEnd = useCentralOnly
                ? e
                : moment.min(e, moment(yesterdayStart).subtract(1, 'ms'));

            let centralData: any[] = [];

            // Central storage window
            if (s.isSameOrBefore(histEnd)) {
                const startYear = s.year();
                const endYear = histEnd.year();
                const years: number[] = [];
                for (let y = startYear; y <= endYear; y++) years.push(y);

                const yearlyResults = await Promise.all(
                    years.map(async (year) => {
                        const yearStart = moment().year(year).startOf('year');
                        const yearEnd = moment().year(year).endOf('year');

                        const qStart = moment.max(s, yearStart);
                        const qEnd = moment.min(histEnd, yearEnd);

                        if (qStart.isAfter(qEnd)) return [];

                        const collectionName = `central_storage_${year}`;
                        const CentralStorage = getCentralStorageModel(collectionName);

                        const results = await CentralStorage.find({
                            client_id: { $in: objectIds },
                            date: {
                                $gte: moment(qStart).startOf("day").toDate(),
                                $lte: moment(qEnd).endOf("day").toDate()
                            }
                        }).lean();

                        // ✅ FIX: Filter out hourly data from Central Storage
                        const dailyOnly = results.filter((doc: any) => {
                            const dataDate = doc.data?.date || '';
                            // Skip if data.date contains time component (e.g., "2026-01-01T06:00:00Z")
                            const isHourly = typeof dataDate === 'string' &&
                                dataDate.includes('T') &&
                                dataDate.includes(':');
                            return !isHourly;  // Keep only daily data
                        });

                        return dailyOnly;  // ✅ Return filtered data
                    })
                );
                centralData = yearlyResults.flat();
            }

            // ✅ UPDATED: AccountSummary with new raw structure
            let accountSummaryData: any[] = [];
            if (!useCentralOnly && e.isSameOrAfter(yesterdayStart)) {
                const recentStart = moment.max(s, yesterdayStart);
                const recentDocs = await AccountSummary.find({
                    client_id: { $in: objectIds },
                    date: {
                        $gte: recentStart.format("YYYY-MM-DD"),
                        $lte: e.format("YYYY-MM-DD") + " 23:59"
                    }
                }).lean();

                recentDocs.forEach((doc: any) => {
                    const raw = doc.raw || {};

                    // Shopify
                    if (raw.shopify) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "shopify",
                            data: raw.shopify
                        });
                    }

                    // GA
                    if (raw.ga) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "ga",
                            data: raw.ga
                        });
                    }

                    // Meta
                    if (raw.meta) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "meta",
                            data: raw.meta
                        });
                    }

                    // Adword
                    if (raw.adword) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "adword",
                            data: raw.adword
                        });
                    }
                });
            }

            // Filter overlapping dates
            const hourlyDates = new Set(accountSummaryData.map(d => moment(d.date).format("YYYY-MM-DD")));
            const filteredHistorical = useCentralOnly
                ? centralData
                : centralData.filter(doc => !hourlyDates.has(moment(doc.date).format("YYYY-MM-DD")));

            return [...filteredHistorical, ...accountSummaryData];
        };


        // Monthly Stats Date Ranges (REAL-WORLD, independent of start/end)
        const todayRange = {
            start: moment.utc().startOf('day'),
            end: moment.utc().endOf('day')
        };

        const yesterdayRange = {
            start: moment.utc().subtract(1, 'days').startOf('day'),
            end: moment.utc().subtract(1, 'days').endOf('day')
        };

        const sevenDaysRange = {
            start: moment.utc().subtract(6, 'days').startOf('day'),
            end: moment.utc().endOf('day')
        };

        const thirtyDaysRange = {
            start: moment.utc().subtract(29, 'days').startOf('day'),
            end: moment.utc().endOf('day')
        };

        const [currentData, prevData, rawHistory, todayData, yesterdayData, sevenDaysData, thirtyDaysData] = await Promise.all([
            fetchMetrics(currentStart, currentEnd, visibleClientIds, { centralOnly: centralOnlyForRange }),
            fetchMetrics(prevStart, prevEnd, visibleClientIds, { centralOnly: centralOnlyForRange }),
            fetchRawHistory(currentStart, currentEnd, visibleClientIds, { centralOnly: centralOnlyForRange }),
            fetchMetrics(todayRange.start, todayRange.end, visibleClientIds, { centralOnly: false }),
            fetchMetrics(yesterdayRange.start, yesterdayRange.end, visibleClientIds, { centralOnly: false }),
            fetchMetrics(sevenDaysRange.start, sevenDaysRange.end, visibleClientIds, { centralOnly: false }),
            fetchMetrics(thirtyDaysRange.start, thirtyDaysRange.end, visibleClientIds, { centralOnly: true }),
        ]);

        const currentDataMap = Object.fromEntries(
            currentData.map(item => [item._id.toString(), item])
        );
        const prevDataMap = Object.fromEntries(
            prevData.map(item => [item._id.toString(), item])
        );

        const buildMonthlyRevenueMap = (rows: IAggregationResult[]) => {
            const map: Record<string, { shopify: number; ga: number; paid: number }> = {};
            rows.forEach(r => {
                const id = r._id.toString();
                map[id] = {
                    shopify: r.shopify_revenue || 0,
                    ga: r.ga_revenue || 0,
                    paid: (r.meta_revenue || 0) + (r.google_revenue || 0)
                };
            });
            return map;
        };

        const todayRevMap = buildMonthlyRevenueMap(todayData);
        const yesterdayRevMap = buildMonthlyRevenueMap(yesterdayData);
        const sevenDaysRevMap = buildMonthlyRevenueMap(sevenDaysData);
        const thirtyDaysRevMap = buildMonthlyRevenueMap(thirtyDaysData);

        // console.log('📊 Monthly Revenue Maps Sample:', {
        //     todayCount: Object.keys(todayRevMap).length,
        //     yesterdayCount: Object.keys(yesterdayRevMap).length,
        //     sevenDaysCount: Object.keys(sevenDaysRevMap).length,
        //     thirtyDaysCount: Object.keys(thirtyDaysRevMap).length,
        //     sampleToday: Object.values(todayRevMap)[0],
        //     sampleSevenDays: Object.values(sevenDaysRevMap)[0]
        // });

        // Bulk Fetch Metadata
        const allConnectionsRaw = await ClientConnections.find({ client_id: { $in: visibleClientIds } })
            .select('client_id network value token')
            .lean() as any[];
        const allIntegrationsRaw = await Integrations.find({ client_id: { $in: objectIds } })
            .select('client_id network store_url token access_token accessToken')
            .lean() as any[];

        const connectionsMap = new Map<string, any[]>();
        const integrationsMap = new Map<string, any[]>();

        allConnectionsRaw.forEach((conn: any) => {
            const cid = conn.client_id.toString();
            if (!connectionsMap.has(cid)) connectionsMap.set(cid, []);
            connectionsMap.get(cid)?.push(conn);
        });

        allIntegrationsRaw.forEach((int: any) => {
            const cid = int.client_id.toString();
            if (!integrationsMap.has(cid)) integrationsMap.set(cid, []);
            integrationsMap.get(cid)?.push(int);
        });

        const clientLimit = pLimit(10);

        const clientWrapper = await Promise.all(visibleClients.map((client) =>
            clientLimit(async () => {
                const cId = client._id.toString();

                const allConnections = connectionsMap.get(cId) || [];
                const allIntegrations = integrationsMap.get(cId) || [];
                const shopifyFormula = client?.setting?.shopify_revenue_settings?.account_summary || null;

                if (allConnections.length === 0 && allIntegrations.length === 0) {
                    return null;
                }

                const curr = currentDataMap[cId] || {} as any;
                const prev = prevDataMap[cId] || {} as any;

                const calcCpc = (s: number, c: number) => c > 0 ? s / c : 0;
                const calcRoas = (r: number, s: number) => s > 0 ? r / s : 0;

                const networks = [];

                for (const platform of PLATFORM_CONFIG) {
                    let connection = allConnections.find(c => platform.aliases.includes(c.network.toLowerCase()));
                    let integration = allIntegrations.find(i => platform.aliases.includes(i.network.toLowerCase()))
                        || allConnections.find(c => platform.aliases.includes(c.network.toLowerCase()));

                    const netStat: any = { network: platform.label };

                    if (connection) {
                        netStat.account_id = connection.value;
                    } else if (integration) {
                        const integParams = integration as any;
                        netStat.account_id = integParams.account_id || integParams.store_url;
                    }

                    if (platform.id === "meta") {
                        netStat.revenue = curr.meta_revenue || 0;
                        netStat.spend = curr.meta_spend || 0;
                        netStat.clicks = curr.meta_clicks || 0;
                        netStat.cpc = calcCpc(netStat.spend, netStat.clicks);
                        netStat.roas = calcRoas(netStat.revenue, netStat.spend);

                        // Previous Meta
                        netStat.previous_revenue = prev.meta_revenue || 0;
                        netStat.previous_spend = prev.meta_spend || 0;
                        netStat.previous_clicks = prev.meta_clicks || 0;
                        netStat.previous_cpc = calcCpc(netStat.previous_spend, netStat.previous_clicks);
                        netStat.previous_roas = calcRoas(netStat.previous_revenue, netStat.previous_spend);
                    }

                    if (platform.id === "adword") {
                        netStat.revenue = curr.google_revenue || 0;
                        netStat.spend = curr.google_spend || 0;
                        netStat.clicks = curr.google_clicks || 0;
                        netStat.cpc = calcCpc(netStat.spend, netStat.clicks);
                        netStat.roas = calcRoas(netStat.revenue, netStat.spend);

                        // Previous Adword
                        netStat.previous_revenue = prev.google_revenue || 0;
                        netStat.previous_spend = prev.google_spend || 0;
                        netStat.previous_clicks = prev.google_clicks || 0;
                        netStat.previous_cpc = calcCpc(netStat.previous_spend, netStat.previous_clicks);
                        netStat.previous_roas = calcRoas(netStat.previous_revenue, netStat.previous_spend);
                    }

                    if (platform.id === "ga") {
                        netStat.revenue = curr.ga_revenue || 0;
                        netStat.sessions = curr.ga_sessions || 0;

                        // Previous GA
                        netStat.previous_revenue = prev.ga_revenue || 0;
                        netStat.previous_sessions = prev.ga_sessions || 0;
                    }

                    if (platform.id === "shopify") {
                        netStat.sessions = curr.shopify_sessions || 0;
                        // Ensure revenue is also present if needed for fallback
                        netStat.revenue = curr.shopify_revenue || 0;

                        // Previous Shopify
                        netStat.previous_revenue = prev.shopify_revenue || 0;
                        netStat.previous_sessions = prev.shopify_sessions || 0;
                    }

                    if (netStat.account_id) {
                        try {
                            const rawIntegration = integration as any;
                            const accessToken = rawIntegration?.token || rawIntegration?.access_token || rawIntegration?.accessToken;

                            const today = moment.utc();
                            const yesterday = moment.utc().subtract(1, 'days');


                            const reqStart = moment(startDate);
                            const reqEnd = moment(endDate);

                            const hourlyStart = yesterday.startOf('day');

                            let dailyData: any = {};
                            let hourlyData: any = {};

                            if (rawHistory.length > 0) {
                                const relevantHistory = (rawHistory as any[]).filter((doc: any) =>
                                    doc.client_id.toString() === cId &&
                                    (
                                        (platform.id === 'meta' && ['meta'].includes(doc.network.toLowerCase())) ||
                                        (platform.id === 'adword' && ['adword'].includes(doc.network.toLowerCase())) ||
                                        (platform.id === 'ga' && ['ga'].includes(doc.network.toLowerCase())) ||
                                        (platform.id === 'shopify' && doc.network.toLowerCase() === 'shopify')
                                    )
                                );

                                relevantHistory.forEach((doc: any) => {
                                    let dateKey: string;
                                    if (doc.date instanceof Date) {
                                        dateKey = moment.utc(doc.date).format('YYYY-MM-DD');
                                    } else {
                                        dateKey = String(doc.date);
                                    }

                                    const isHourlyEntry = dateKey.includes(' ');
                                    if (allowLiveHourly && !isHourlyEntry) {
                                        const docDate = moment.utc(dateKey.split(' ')[0]);
                                        if (docDate.isSameOrAfter(hourlyStart, 'day')) return;
                                    }
                                    dailyData[dateKey] = formatLiveDataByPlatform(platform.id, doc.data, shopifyFormula);
                                });
                            }

                            // Replace the live API block condition and logic:

                            // Check if requested date is OLD (before yesterday)
                            const isOldDateRequest = reqEnd.isBefore(hourlyStart, 'day');
                            if (allowLiveHourly) {
                                const hourlyStartDateStr = reqStart.format('YYYY-MM-DD');
                                const hourlyEndDateStr = reqEnd.format('YYYY-MM-DD');

                                const cacheKey = `${platform.id}:${netStat.account_id}:${hourlyStartDateStr}:${hourlyEndDateStr}`;
                                let raw: any = getLiveCache(cacheKey);

                                if (!raw) {
                                    try {
                                        if (platform.id === "meta") {
                                            const metaLib = new MetaService();
                                            raw = await metaLib.getMetaAccountData({
                                                accountId: netStat.account_id,
                                                startDate: hourlyStartDateStr,
                                                endDate: hourlyEndDateStr,
                                                clientId: cId,
                                                connectionId: connection?._id?.toString(),
                                                granularity: 'hourly'
                                            });
                                        } else if (platform.id === "adword") {
                                            const adwordLib = new AdwordService();
                                            raw = await adwordLib.adwordReport({
                                                customerId: netStat.account_id,
                                                startDate: hourlyStartDateStr,
                                                endDate: hourlyEndDateStr,
                                                clientId: cId,
                                                connectionId: connection?._id?.toString(),
                                                granularity: 'hourly'
                                            });
                                        } else if (platform.id === "ga") {
                                            const analytics = new analyticsDataService();
                                            raw = await analytics.fetchAnalyticsReport({
                                                accountId: netStat.account_id,
                                                startDate: hourlyStartDateStr,
                                                endDate: hourlyEndDateStr,
                                                clientId: cId,
                                                connectionId: connection?._id?.toString(),
                                                granularity: 'hourly'
                                            });
                                        } else if (platform.id === "shopify" && connection?.token) {
                                            const shopify = new ShopifyService();
                                            raw = await shopify.salesreport({
                                                storeUrl: netStat.account_id,
                                                accessToken: connection?.token,
                                                startDate: hourlyStartDateStr,
                                                endDate: hourlyEndDateStr,
                                                clientId: cId,
                                                connectionId: connection?._id?.toString(),
                                                granularity: 'hourly'
                                            });
                                        }

                                        if (raw) {
                                            setLiveCache(cacheKey, raw);
                                        }
                                    } catch (apiError: any) {
                                        hourlyData = {};
                                        raw = null;
                                    }
                                }

                                hourlyData = {};
                                if (raw && typeof raw === 'object') {
                                    Object.entries(raw).forEach(([k, v]: [string, any]) => {
                                        let formattedKey = k;

                                        // GA/Meta/Adword: keep hour as-is; Shopify: adjust by -6h
                                        if (k.includes('T')) {
                                            const match = k.match(/(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}:\d{2}Z?/);
                                            if (match) {
                                                const datePart = match[1];
                                                const utcHour = parseInt(match[2], 10);
                                                let displayHour = utcHour;
                                                let displayDate = datePart;

                                                if (platform.id === "shopify") {
                                                    displayHour = utcHour - 6; // your chosen offset
                                                    if (displayHour < 0) {
                                                        displayHour += 24;
                                                        displayDate = moment(datePart).subtract(1, 'day').format('YYYY-MM-DD');
                                                    }
                                                }

                                                formattedKey = `${displayDate} ${displayHour.toString().padStart(2, '0')}:00`;
                                            }
                                        }

                                        hourlyData[formattedKey] = formatLiveDataByPlatform(platform.id, v, shopifyFormula);
                                    });
                                }
                            }
                            const startMoment = moment(startDate);  // ✅ Use original startDate
                            const endMoment = moment(endDate);
                            const datePatterns: any[] = [];

                            const cursor = startMoment.clone();
                            while (cursor.isSameOrBefore(endMoment, 'day')) {
                                datePatterns.push({ date: { $regex: new RegExp(`^${cursor.format('YYYY-MM-DD')}`) } });
                                cursor.add(1, 'day');
                            }

                            const accountSummaryDocs = await AccountSummary.find({
                                client_id: new mongoose.Types.ObjectId(cId),
                                $or: datePatterns
                            }).lean();


                            const accountSummaryData: any = {};
                            accountSummaryDocs.forEach((doc: any) => {
                                const raw = doc.raw || {};
                                let dateKey = String(doc.date);

                                // ✅ FIX: Add 7 hours offset
                                if (dateKey.includes(' ')) {
                                    const [datePart, timePart] = dateKey.split(' ');
                                    const hour = parseInt(timePart.split(':')[0], 10);

                                    // Add 7 hours
                                    let correctHour = hour + 7;
                                    let correctDate = datePart;

                                    if (correctHour >= 24) {
                                        correctHour -= 24;
                                        correctDate = moment(datePart).add(1, 'day').format('YYYY-MM-DD');
                                    }

                                    dateKey = `${correctDate} ${correctHour.toString().padStart(2, '0')}:00`;
                                }

                                let platformData = null;
                                if (platform.id === 'shopify') {
                                    platformData = raw.shopify || null;
                                } else if (platform.id === 'ga') {
                                    platformData = raw.ga || null;
                                } else if (platform.id === 'meta') {
                                    platformData = raw.meta || null;
                                } else if (platform.id === 'adword') {
                                    platformData = raw.adword || null;
                                }

                                if (platformData) {
                                    accountSummaryData[dateKey] = formatLiveDataByPlatform(platform.id, platformData, shopifyFormula);
                                }
                            });

                            const filteredDailyData: any = {};
                            Object.keys(dailyData).forEach(key => {
                                const dateOnly = key.split(' ')[0];

                                const hasAccountSummaryHourly = Object.keys(accountSummaryData).some(k => k.startsWith(dateOnly));
                                const hasLiveHourly = Object.keys(hourlyData).some(k => k.startsWith(dateOnly));

                                if (!hasAccountSummaryHourly && !hasLiveHourly) {
                                    filteredDailyData[key] = dailyData[key];
                                }
                            });

                            netStat.timeseries = {
                                ...filteredDailyData,
                                ...accountSummaryData,
                                ...hourlyData  // ✅ ADD THIS - Live API data takes priority!
                            };

                            if (centralOnlyForRange) {
                                netStat.timeseries = fillTimeseriesGaps(netStat.timeseries, currentStart, currentEnd, platform.id);
                            }

                            netStat.timeseries = cleanTimeseriesByPlatform(netStat.timeseries, platform.id);

                            if (platform.id === "meta" || platform.id === "adword") {
                                const stats = calculateStatsFromTimeseries(netStat.timeseries);
                                netStat.revenue = stats.revenue;
                                netStat.spend = stats.spend;
                                netStat.clicks = stats.clicks;
                                netStat.impressions = stats.impressions;
                                netStat.cpc = stats.cpc;
                                netStat.ctr = stats.ctr;
                                netStat.roas = stats.roas;
                                if (platform.id === "meta") {
                                    netStat.outbound_clicks = stats.outbound_clicks;
                                }
                            }

                            if (platform.id === "ga") {
                                const stats = calculateStatsFromTimeseries(netStat.timeseries);
                                netStat.revenue = stats.revenue;
                                netStat.sessions = stats.sessions;
                            }

                            // ⭐ SHOPIFY: Aggregate first, then apply formula
                            if (platform.id === "shopify") {
                                const formula = shopifyFormula || "G-D+S+T";


                                let totalGrossSales = 0;
                                let totalDiscounts = 0;
                                let totalShipping = 0;
                                let totalTaxes = 0;
                                let totalReturns = 0;
                                let totalSessions = 0;
                                let totalOrders = 0;

                                Object.entries(netStat.timeseries).forEach(([dateKey, dataPoint]: [string, any]) => {
                                    if (dataPoint && !dataPoint.error) {
                                        const grossSales = Number(dataPoint.gross_sales || 0);
                                        const discounts = Math.abs(Number(dataPoint.discounts || 0));
                                        const shipping = Number(dataPoint.shipping_charges || 0);
                                        const taxes = Number(dataPoint.taxes || 0);
                                        const returns = Math.abs(Number(dataPoint.returns || 0));
                                        const sessions = Number(dataPoint.sessions || 0);
                                        const orders = Number(dataPoint.orders || 0);

                                        const dayRevenue = calculateAggregatedShopifyRevenue(
                                            {
                                                gross_sales: grossSales,
                                                discounts: discounts,
                                                shipping_charges: shipping,
                                                taxes: taxes,
                                                returns: returns
                                            },
                                            formula
                                        );

                                        // Update timeseries
                                        netStat.timeseries[dateKey].revenue = Number(dayRevenue.toFixed(2));

                                        // Aggregate
                                        totalGrossSales += grossSales;
                                        totalDiscounts += discounts;
                                        totalShipping += shipping;
                                        totalTaxes += taxes;
                                        totalReturns += returns;
                                        totalSessions += sessions;
                                        totalOrders += orders;
                                    }
                                });

                                const aggregatedRevenue = calculateAggregatedShopifyRevenue(
                                    {
                                        gross_sales: totalGrossSales,
                                        discounts: totalDiscounts,
                                        shipping_charges: totalShipping,
                                        taxes: totalTaxes,
                                        returns: totalReturns
                                    },
                                    formula
                                );

                                netStat.revenue = Number(aggregatedRevenue.toFixed(2));
                                netStat.sessions = totalSessions;
                                netStat.orders = totalOrders;
                                netStat.avg_order_value = totalOrders > 0
                                    ? Number((netStat.revenue / totalOrders).toFixed(2))
                                    : 0;


                                // Rebuild chart
                                const chartAggregation: Aggregation = centralOnlyForRange ? 'day' : (requestedAggregation || 'hour');
                                netStat.chart_data = buildPlatformChartData(netStat.timeseries, {
                                    startDate: startDate,
                                    endDate: endDate,
                                    aggregation: chartAggregation,
                                    platform: platform.id
                                });
                            }

                            const chartAggregation: Aggregation = centralOnlyForRange ? 'day' : (requestedAggregation || 'hour');
                            netStat.chart_data = buildPlatformChartData(netStat.timeseries, {
                                startDate: startDate,
                                endDate: endDate,
                                aggregation: chartAggregation,
                                platform: platform.id
                            });

                        } catch (err: any) {
                            netStat.timeseries = { error: "Failed to fetch timeseries data" };
                            netStat.chart_data = null;
                        }
                    } else {
                        netStat.timeseries = {};
                        netStat.chart_data = null;
                    }

                    if (connection || integration) {
                        networks.push(netStat);
                    }
                }


                const allChannelsTimeSeries: { [key: string]: any } = {};

                // Check which platforms are active for this client
                const hasShopify = networks.some(n => n.network?.toLowerCase() === 'shopify');
                const hasGA = networks.some(n => n.network?.toLowerCase() === 'ga' || n.network?.toLowerCase() === 'google analytics');

                networks.forEach(net => {
                    if (!net.timeseries || typeof net.timeseries !== 'object') return;

                    const networkName = (net.network || '').toLowerCase();

                    const isMeta = networkName === 'meta';
                    const isAdword = networkName === 'adword' || networkName === 'google ads';
                    const isShopify = networkName === 'shopify';
                    const isGA = networkName === 'ga' || networkName === 'google analytics';

                    Object.entries(net.timeseries).forEach(([dateKey, dataPoint]: [string, any]) => {
                        if (!dataPoint || dataPoint.error) return;

                        if (!allChannelsTimeSeries[dateKey]) {
                            allChannelsTimeSeries[dateKey] = {
                                revenue: 0,
                                spend: 0,
                                sessions: 0,
                                clicks: 0
                            };
                        }

                        const agg = allChannelsTimeSeries[dateKey];

                        // ------- REVENUE -------
                        // Priority: Shopify > GA > (Meta + Adword)
                        if (hasShopify) {
                            if (isShopify) {
                                agg.revenue += Number(dataPoint.revenue || dataPoint.total_sales || 0);
                            }
                        } else if (hasGA) {
                            if (isGA) {
                                agg.revenue += Number(dataPoint.revenue || 0);
                            }
                        } else {
                            if (isMeta || isAdword) {
                                agg.revenue += Number(dataPoint.revenue || 0);
                            }
                        }

                        // ------- SPEND & CLICKS (Meta + Adword only) -------
                        if (isMeta || isAdword) {
                            agg.spend += Number(dataPoint.spend || 0);
                            agg.clicks += Number(dataPoint.clicks || 0);
                        }

                        // ------- SESSIONS -------
                        // Prefer Shopify; if no Shopify but GA hai to GA se
                        if (hasShopify) {
                            if (isShopify) {
                                agg.sessions += Number(dataPoint.sessions || 0);
                            }
                        } else if (hasGA) {
                            if (isGA) {
                                agg.sessions += Number(dataPoint.sessions || 0);
                            }
                        }
                    });
                });

                // Hourly aggregation if needed
                if (!centralOnlyForRange && Object.keys(allChannelsTimeSeries).length > 0) {
                    const aggregatedAllChannels = aggregateToHourly(allChannelsTimeSeries);
                    Object.keys(allChannelsTimeSeries).forEach(k => delete allChannelsTimeSeries[k]);
                    Object.assign(allChannelsTimeSeries, aggregatedAllChannels);
                }

                // Daily gap fill if only central
                if (centralOnlyForRange) {
                    const filledAllChannels = fillTimeseriesGaps(allChannelsTimeSeries, currentStart, currentEnd);
                    Object.keys(allChannelsTimeSeries).forEach(k => delete allChannelsTimeSeries[k]);
                    Object.assign(allChannelsTimeSeries, filledAllChannels);
                }

                // Final per-point CPC, rounding
                Object.keys(allChannelsTimeSeries).forEach(dateKey => {
                    const d = allChannelsTimeSeries[dateKey];
                    d.revenue = Number((d.revenue || 0).toFixed(2));
                    d.spend = Number((d.spend || 0).toFixed(2));
                    d.sessions = Number((d.sessions || 0).toFixed(2));
                    d.clicks = Number((d.clicks || 0).toFixed(2));
                    d.cpc = d.clicks > 0 ? Number((d.spend / d.clicks).toFixed(2)) : 0;
                });

                // Global stats from timeseries
                const allChannelsTimeseriesStats = calculateStatsFromTimeseries(allChannelsTimeSeries);
                const totalClicks = allChannelsTimeseriesStats.clicks;
                const totalSpend = allChannelsTimeseriesStats.spend;
                const totalRevenue = allChannelsTimeseriesStats.revenue;
                const totalSessions = allChannelsTimeseriesStats.sessions;

                // Pre-calc previous stats for All Channels
                const isShopifyActiveForPrev = allConnections.some(c => c.network.toLowerCase().includes('shopify')) ||
                    allIntegrations.some(i => i.network.toLowerCase().includes('shopify'));
                const isGaActiveForPrev = allConnections.some(c => c.network.toLowerCase().includes('ga')) ||
                    allIntegrations.some(i => i.network.toLowerCase().includes('ga'));

                const paidPrevRev = (prev.meta_revenue || 0) + (prev.google_revenue || 0);
                const prevRev = isShopifyActiveForPrev
                    ? (prev.shopify_revenue || 0)
                    : isGaActiveForPrev
                        ? (prev.ga_revenue || 0)
                        : paidPrevRev;
                const prevSpd = (prev.meta_spend || 0) + (prev.google_spend || 0);
                const prevClks = (prev.meta_clicks || 0) + (prev.google_clicks || 0);
                const prevSess = (isShopifyActiveForPrev || isGaActiveForPrev) ? (prev.sessions || 0) : 0;

                const allChannelsStats: any = {
                    network: "All Channels",
                    revenue: totalRevenue,                       // 👈 Yahan pe above priority ka result hai
                    spend: totalSpend,                           // Meta + Adword
                    sessions: totalSessions,                     // Shopify or GA
                    cpc: totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0,
                    roas: totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0,
                    previous_revenue: prevRev,
                    previous_spend: prevSpd,
                    previous_clicks: prevClks,
                    previous_sessions: prevSess,
                    previous_cpc: prevClks > 0 ? Number((prevSpd / prevClks).toFixed(2)) : 0,
                    previous_roas: prevSpd > 0 ? Number((prevRev / prevSpd).toFixed(2)) : 0,
                    timeseries: allChannelsTimeSeries,
                    chart_data: null
                };

                const allChannelsAggregation: Aggregation =
                    centralOnlyForRange ? 'day' : (requestedAggregation || 'hour');

                allChannelsStats.chart_data = buildPlatformChartData(allChannelsTimeSeries, {
                    startDate: startDate,
                    endDate: endDate,
                    aggregation: allChannelsAggregation,
                    platform: 'all_channels'
                });

                // Add at top of networks
                networks.unshift(allChannelsStats);



                const isShopifyActive = allConnections.some(c => c.network.toLowerCase().includes('shopify')) ||
                    allIntegrations.some(i => i.network.toLowerCase().includes('shopify'));
                const isGaActive = allConnections.some(c => c.network.toLowerCase().includes('ga')) ||
                    allIntegrations.some(i => i.network.toLowerCase().includes('ga'));

                const showSessions = isShopifyActive || isGaActive;

                const pickMonthlyRevenue = (
                    revMap: Record<string, { shopify: number; ga: number; paid: number }>,
                    clientId: string
                ) => {
                    const row = revMap[clientId];
                    if (!row) return 0;

                    if (isShopifyActive) return row.shopify;
                    if (isGaActive) return row.ga;
                    return row.paid; // meta + adword
                };

                const monthly_stats = {
                    today: pickMonthlyRevenue(todayRevMap, cId),
                    yesterday: pickMonthlyRevenue(yesterdayRevMap, cId),
                    "7days": pickMonthlyRevenue(sevenDaysRevMap, cId),
                    "30days": pickMonthlyRevenue(thirtyDaysRevMap, cId)
                };

                // console.log(`💰 Monthly Stats for ${client.name}:`, {
                //     isShopifyActive,
                //     isGaActive,
                //     todayRaw: todayRevMap[cId],
                //     monthly_stats
                // });



                const paidRevenue = (curr.meta_revenue || 0) + (curr.google_revenue || 0);
                const overallRevenue = isShopifyActive
                    ? (curr.shopify_revenue || 0)
                    : isGaActive
                        ? (curr.ga_revenue || 0)
                        : paidRevenue;

                // Previous Revenue Logic
                const paidPrevRevenue = (prev.meta_revenue || 0) + (prev.google_revenue || 0);
                const previousRevenue = isShopifyActive
                    ? (prev.shopify_revenue || 0)
                    : isGaActive
                        ? (prev.ga_revenue || 0)
                        : paidPrevRevenue;

                // Spend/clicks consistent with All Channels logic
                const overallSpend = (curr.meta_spend || 0) + (curr.google_spend || 0);
                const overallClicks = (curr.meta_clicks || 0) + (curr.google_clicks || 0);

                // Previous Spend Logic
                const previousSpend = (prev.meta_spend || 0) + (prev.google_spend || 0);

                const overall_stats = {
                    revenue: overallRevenue,
                    spend: overallSpend,
                    sessions: showSessions ? (curr.sessions || 0) : 0, // ya: same Shopify/GA priority se
                    total_clicks: overallClicks,
                    cpc: calcCpc(overallSpend, overallClicks),
                    roas: calcRoas(overallRevenue, overallSpend),
                    previous_revenue: previousRevenue,
                    previous_spend: previousSpend,
                };
                return {
                    client_id: cId,
                    client_name: client.name,
                    status: client.status,
                    overall_stats,
                    networks,
                    monthly_stats
                };
            })
        ));

        const validClientWrapper = clientWrapper.filter(client => client !== null);

        const globalLastUpdated = currentData.reduce((max: Date | null, curr: any) => {
            const currDate = curr.last_updated ? new Date(curr.last_updated) : null;
            if (!currDate) return max;
            if (!max) return currDate;
            return currDate > max ? currDate : max;
        }, null as Date | null);

        const finalLastUpdated = globalLastUpdated || new Date();

        const hiddenClientDocs = await HideClient.find().select('client_ids').lean();
        const hiddenClientIds = new Set<string>();

        hiddenClientDocs.forEach(doc => {
            if (doc.client_ids && Array.isArray(doc.client_ids)) {
                doc.client_ids.forEach((id: any) => {
                    hiddenClientIds.add(id.toString());
                });
            }
        });

        const filteredClientWrapper = validClientWrapper.filter(client => {
            return !hiddenClientIds.has(client.client_id);
        });

        filteredClientWrapper.forEach(client => {
            if (client.networks && Array.isArray(client.networks)) {
                client.networks = client.networks.map(n => {
                    const cleaned = { ...n };
                    delete cleaned.timeseries;
                    return cleaned;
                });
            }
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Performance] Account Summary API completed in ${duration}s`);

        res.status(200).json({
            status_code: 200,
            success: true,
            message: "Account summary fetched successfully",
            data: filteredClientWrapper,
            last_updated: finalLastUpdated
        });

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`[Error] Account Summary API failed after ${duration}s:`, error);
        res.status(500).json({
            status_code: 500,
            success: false,
            message: "Failed to fetch summary",
            error
        });
    }
};

export const refreshAccountSummary = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const defaultStartDate = moment.utc().subtract(1, 'days').format('YYYY-MM-DD');
        const defaultEndDate = moment.utc().format('YYYY-MM-DD');

        const start = moment.utc(String(startDate || defaultStartDate));
        const end = moment.utc(String(endDate || defaultEndDate));

        console.log(`[Manual Refresh] Triggering refresh from ${start.format('YYYY-MM-DD')} to ${end.format('YYYY-MM-DD')}`);

        // Run in background
        runHourlySummaryOptimized().catch(err => {
            console.error('[Manual Refresh] Error:', err);
        });

        res.status(202).json({
            success: true,
            message: `Account Summary refresh triggered for ${start.format('YYYY-MM-DD')} to ${end.format('YYYY-MM-DD')}.`
        });
    } catch (error) {
        console.error("Error refreshing account summary:", error);
        res.status(500).json({ success: false, message: 'Failed to refresh data', error });
    }
};

export const fixTimestamps = async (req: Request, res: Response) => {
    try {
        const result = await AccountSummary.updateMany(
            { $or: [{ updated_at: { $exists: false } }, { updated_at: null }] },
            { $set: { updated_at: new Date() } }
        );
        res.status(200).json({ success: true, message: `Fixed timestamps for ${result.modifiedCount} records.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fix timestamps', error });
    }
};




import PerformanceEntitiesSchema from '../db/models/performanceEntity';



export const getAllPerformanceEntities = async (req: Request, res: Response) => {
    try {
        const { client_id, status } = req.query;

        const filter: any = {};

        if (client_id) {
            if (!mongoose.Types.ObjectId.isValid(client_id as string)) {
                return res.status(400).json({
                    status_code: 400,
                    success: false,
                    message: "Invalid client_id format",
                    data: null
                });
            }
            filter.client_id = new mongoose.Types.ObjectId(client_id as string);
        }

        if (status) {
            filter.status = String(status);
        }

        const entities = await PerformanceEntitiesSchema.find(filter).lean();

        if (!entities.length) {
            return res.status(422).json({
                status_code: 422,
                success: false,
                message: "No performance entities found",
                data: []
            });
        }

        // Group by group_name
        const grouped: Record<string, any[]> = {};

        entities.forEach(item => {
            const cleaned = {
                // _id: item._id,
                // client_id: item.client_id,
                entity_name: item.entity_name,
                meta: item.meta || null,
                adword: item.adword || null
            };

            if (!grouped[item.group_name]) grouped[item.group_name] = [];
            grouped[item.group_name].push(cleaned);
        });

        // Format result
        const finalResult = Object.entries(grouped).map(([group_name, data]) => ({
            group_name,
            data
        }));

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: "Performance entities fetched successfully",
            data: finalResult
        });

    } catch (error: any) {
        return res.status(500).json({
            status_code: 500,
            success: false,
            message: "Failed to fetch performance entities",
            data: error.message
        });
    }
};


// export const getPerformanceClientDetailPost = async (req: Request, res: Response) => {
//     try {
//         const { client_id, start_date, end_date, account_name } = req.body;

//         if (!client_id || !mongoose.Types.ObjectId.isValid(client_id)) {
//             return res.status(400).json({ success: false, message: "Invalid client_id" });
//         }

//         // ========== CONNECTIONS ==========
//         const connections = await ClientConnections.find({
//             client_id: new mongoose.Types.ObjectId(client_id)
//         })
//             .select("_id client_id network value token account_name")
//             .lean();

//         // ========== ALL ENTITIES ==========
//         const performanceEntities = await PerformanceEntitiesSchema.find({}).lean();

//         const grouped: Record<string, any[]> = {};
//         performanceEntities.forEach(item => {
//             if (!grouped[item.group_name]) grouped[item.group_name] = [];
//             grouped[item.group_name].push(item);
//         });

//         // ========== EXTRACT ALLOWED AD IDS ==========
//         const allowedAdIdsByLabel: Record<string, Set<string>> = {
//             main_account: new Set(),
//             nba: new Set(),
//             nhl: new Set(),
//             mlb: new Set(),
//             nfl: new Set(),
//         };

//         Object.values(grouped).forEach(items => {
//             items.forEach(item => {
//                 if (!item.meta) return;

//                 Object.entries(item.meta).forEach(([key, value]) => {
//                     if (allowedAdIdsByLabel[key]) {
//                         String(value)
//                             .split(",")
//                             .map(v => v.trim())
//                             .filter(Boolean)
//                             .forEach(id => allowedAdIdsByLabel[key].add(id));
//                     }
//                 });
//             });
//         });

//         // ========== PARALLEL CALLS ==========
//         const meta = new MetaService();
//         const adword = new AdwordService();

//         const nameMap: any = {
//             main_account: "Main account",
//             nba: "NBA",
//             nhl: "NHL",
//             mlb: "MLB",
//             nfl: "NFL"
//         };

//         const metaCalls = Object.keys(allowedAdIdsByLabel).map(label => {
//             const adIds = Array.from(allowedAdIdsByLabel[label]);
//             if (!adIds.length) {
//                 return Promise.resolve({ label, success: true, data: [] });
//             }

//             const metaConn = connections.find(
//                 c => c.network === "meta" &&
//                     c.account_name?.toLowerCase() === nameMap[label].toLowerCase()
//             );

//             if (!metaConn) {
//                 return Promise.resolve({ label, success: true, data: [] });
//             }

//             return meta.getMetaAdData({
//                 accountId: metaConn.value,
//                 adId: adIds,
//                 startDate: start_date,
//                 endDate: end_date
//             })
//                 .then(data => ({ label, success: true, data }))
//                 .catch(() => ({ label, success: true, data: [] }));
//         });

//         const adwordConn = connections.find(c => c.network === "adword");
//         const adwordPromise = adwordConn
//             ? adword.performanceReport({
//                 customerId: adwordConn.value,
//                 startDate: start_date,
//                 endDate: end_date,
//                 adGroupIds: [],
//                 assetGroupIds: []
//             }).then(data => ({ label: "adword", success: true, data }))
//             : Promise.resolve({ label: "adword", success: true, data: null });

//         const results = await Promise.all([...metaCalls, adwordPromise]);

//         // ========== FINAL RESPONSE SHAPING ==========
//         const labels: any[] = [];

//         results.forEach(r => {
//             if (r.label === "adword" && r.data) {
//                 labels.push({
//                     label: "adword",
//                     adGroups: r.data.adGroups || [],
//                     assetGroups: r.data.assetGroups || []
//                 });
//                 return;
//             }

//             const allowedSet = allowedAdIdsByLabel[r.label];
//             const campaigns = (r.data || [])
//                 .filter(ad => allowedSet.has(String(ad.ad_id)))
//                 .map(ad => ({
//                     campaignname: ad.campaign_name,
//                     adsetname: ad.adset_name,
//                     adid: ad.ad_id,
//                     adname: ad.ad_name,
//                     spend: Number(ad.spend || 0),
//                     datestart: ad.date_start,
//                     datestop: ad.date_stop,
//                     actionvalues: ad.action_values || []
//                 }));

//             labels.push({
//                 label: r.label,
//                 campaigns
//             });
//         });

//             const shopifyConn = connections.find(c => c.network === "shopify");
//         let shopifyData = null;

//         if (shopifyConn?.value && shopifyConn?.token) {
//           const shopify = new ShopifyService();

//           shopifyData = await shopify.PerformanceReport({
//             storeUrl: shopifyConn.value,
//             accessToken: shopifyConn.token,
//             startDate: start_date,
//             endDate: end_date
//           });
//         }


//         return res.status(200).json({
//             success: true,
//             message: "Performance processed successfully",
//             labels,
//             shopifyData
//         });

//     } catch (error: any) {
//         console.error("❌ Error:", error.message);
//         return res.status(500).json({ success: false, message: "Internal error" });
//     }
// };


export const getPerformanceClientDetailPost = async (req: Request, res: Response) => {
  try {
    const { client_id, start_date, end_date } = req.body;

    if (!client_id || !mongoose.Types.ObjectId.isValid(client_id)) {
      return res.status(400).json({ success: false, message: "Invalid client_id" });
    }

    // ================= CONNECTIONS =================
    const connections = await ClientConnections.find({
      client_id: new mongoose.Types.ObjectId(client_id)
    })
      .select("_id network value account_name token")
      .lean();
      console.log(connections, "connections")

    // ================= ENTITIES =================
    const performanceEntities = await PerformanceEntitiesSchema.find({}).lean();

    const grouped: Record<string, any[]> = {};
    performanceEntities.forEach(item => {
      if (!grouped[item.group_name]) grouped[item.group_name] = [];
      grouped[item.group_name].push(item);
    });

    // ================= META IDS BY LABEL =================
    const metaIdsByLabel: Record<string, Set<string>> = {
      main_account: new Set(),
      nba: new Set(),
      nhl: new Set(),
      mlb: new Set(),
      nfl: new Set(),
    };

    Object.values(grouped).forEach(items => {
      items.forEach(item => {
        if (!item.meta) return;

        Object.entries(item.meta).forEach(([label, ids]) => {
          if (!metaIdsByLabel[label]) return;
          String(ids)
            .split(",")
            .map(x => x.trim())
            .filter(Boolean)
            .forEach(id => metaIdsByLabel[label].add(id));
        });
      });
    });

    // ================= META PARALLEL CALLS =================
    const meta = new MetaService();
    const adword = new AdwordService();

    const nameMap: Record<string, string> = {
      main_account: "Main account",
      nba: "NBA",
      nhl: "NHL",
      mlb: "MLB",
      nfl: "NFL"
    };

    const metaCalls = Object.keys(metaIdsByLabel).map(label => {
      const adIds = [...metaIdsByLabel[label]];
      if (!adIds.length) return Promise.resolve({ label, data: [] });

      const conn = connections.find(
        c => c.network === "meta" &&
             c.account_name?.toLowerCase() === nameMap[label].toLowerCase()
      );
      if (!conn) return Promise.resolve({ label, data: [] });

      return meta.getMetaAdData({
        accountId: conn.value,
        adId: adIds,
        startDate: start_date,
        endDate: end_date
      }).then(data => ({ label, data }))
        .catch(() => ({ label, data: [] }));
    });

    // ================= ADWORD =================
    const adwordConn = connections.find(c => c.network === "adword");
    const adwordResult = adwordConn
      ? await adword.performanceReport({
          customerId: adwordConn.value,
          startDate: start_date,
          endDate: end_date,
          adGroupIds: [],
          assetGroupIds: []
        })
      : null;

    const metaResults = await Promise.all(metaCalls);

    // ================= BUILD LOOKUP MAPS =================
    const metaMap = new Map<string, any>();
    metaResults.forEach(r =>
      r.data.forEach((ad: any) =>
        metaMap.set(String(ad.ad_id), ad)
      )
    );

    const adGroupMap = new Map<string, any>();
    const assetGroupMap = new Map<string, any>();

    if (adwordResult) {
      adwordResult.adGroups?.forEach((g: any) =>
        adGroupMap.set(String(g.ad_group.id), g)
      );
      adwordResult.assetGroups?.forEach((g: any) =>
        assetGroupMap.set(String(g.id), g)
      );
    }

    const shopifyConn = connections.find(c => c.network === "shopify");
let shopifyData = null;

if (shopifyConn?.value && shopifyConn?.token) {
  const shopify = new ShopifyService();

  shopifyData = await shopify.PerformanceReport({
    storeUrl: shopifyConn.value,
    accessToken: shopifyConn.token,
    startDate: start_date,
    endDate: end_date
  });
}


    // ================= FINAL FILTERED RESPONSE =================
    const data = Object.entries(grouped).map(([group_name, entities]) => ({
      group_name,
      data: entities.map(entity => {
        // ---- META ----
        let metaData = null;
        if (entity.meta) {
          const ids = Object.values(entity.meta)
            .flatMap(v => String(v).split(","))
            .map(x => x.trim());

          const matched = ids.map(id => metaMap.get(id)).filter(Boolean);

          if (matched.length) {
            metaData = {
              spend: matched.reduce((s, a) => s + Number(a.spend || 0), 0),
              action_values: matched.flatMap(a => a.action_values || [])
            };
          }
        }

        // ---- ADWORD ----
        let adwordData = null;
        if (entity.adword) {
          let spend = 0;
          let clicks = 0;

          if (entity.adword.ad_group_id) {
            String(entity.adword.ad_group_id)
              .split(",")
              .forEach(id => {
                const g = adGroupMap.get(id.trim());
                if (g) {
                  spend += Number(g.metrics.cost_micros || 0) / 1e6;
                  clicks += Number(g.metrics.clicks || 0);
                }
              });
          }

          if (entity.adword.asset_group_id) {
            String(entity.adword.asset_group_id)
              .split(",")
              .forEach(id => {
                const g = assetGroupMap.get(id.trim());
                if (g) {
                  spend += Number(g.metrics.cost_micros || 0) / 1e6;
                  clicks += Number(g.metrics.clicks || 0);
                }
              });
          }

          if (spend || clicks) {
            adwordData = {
              spend: Number(spend.toFixed(2)),
              clicks
            };
          }
        }

        return {
          entity_name: entity.entity_name,
          meta: metaData,
          adword: adwordData
        };
      }).filter(e => e.meta || e.adword)
    }));

    return res.status(200).json({
      success: true,
      message: "Filtered performance entities",
      data,
      shopify: shopifyData
    });

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};
