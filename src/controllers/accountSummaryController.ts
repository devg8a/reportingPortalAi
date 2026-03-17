import { Request, Response } from "express";
import mongoose from "mongoose";
import AccountSummary from "../db/models/AccountSummary";
import ClientConnections from "../db/models/clientConnections";
import moment from "moment";
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";
import { analyticsDataService } from "../liberaries/PaidMedia/GA4/analyticsDataLib";
import { getCentralStorageModel } from "../db/schema/dynamic-central-model";
import { PLATFORM_CONFIG } from "../utils/platformConstants";
import { formatLiveDataByPlatform } from "../helper/dataFormatters";
import { Aggregation, buildPlatformChartData, filterTimeseriesByHour, } from "../helper/chartBuilder";
import { calculateAggregatedShopifyRevenue, calculateStatsFromTimeseries, recalculateDerivedMetrics, to2, num, } from "../helper/metricsHelper";
import { fetchClientById, } from "../helper/utilityHelper";
import { fetchVisibleClients } from "./hideClientController";
import { fillTimeseriesGaps, cleanTimeseriesByPlatform, aggregateToHourly, } from "../helper/timeseriesHelper";
import { shouldUseLiveOrRecent, getHourlyComparisonRanges, } from "../helper/dateRangeHelper";
import { addToAggregation } from "../helper/aggregationHelper";
import pLimit from "p-limit";
import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import { MetricsCalculator, buildAggregatedTimeseries } from "../helper/metricsHelper";

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


interface IAccountSummaryPayload {
    userId?: string;
    startDate: string;
    endDate: string;
    comparison?: "yesterday_same_hour" | "previous_period";
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
    meta_outbound_clicks?: number;
    meta_revenue: number;
    meta_revenue_1d_view?: number;
    meta_revenue_7d_click?: number;

    google_spend: number;
    google_clicks: number;
    google_revenue: number;

    last_updated?: Date;
}


const buildDiff = (current: number, previous: number) => {
    let c = Number(current);
    if (isNaN(c)) c = 0;

    let p = Number(previous);
    if (isNaN(p)) p = 0;

    const total = Number((c + p).toFixed(2));
    const value = p


    const percentage =
        previous > 0.01
            ? Number((((current - previous) / previous) * 100).toFixed(2))
            : current > 0
                ? 100
                : 0;


    return {
        total,
        value,
        percentage,
        trend: value > 0 ? "up" : value < 0 ? "down" : "neutral"
    };
};


export const getAccountSummary = async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const {
            startDate,
            endDate,
            comparison,
            aggregation,
            compareStartDate,
            compareEndDate,
        }: IAccountSummaryPayload = req.body;

        // console.log(startDate, endDate, "starrtt")

        const includeLive =
            String(
                (req.query as any)?.include_live ??
                (req.body as any)?.include_live ??
                "false",
            ).toLowerCase() === "true";

        const currentStart = moment.utc(startDate).startOf("day");
        const currentEnd = moment.utc(endDate).endOf("day");

        const useLiveOrRecent = shouldUseLiveOrRecent(currentStart, currentEnd);
        const centralOnlyForRange = !useLiveOrRecent;

        let prevStart: moment.Moment | null = null;
        let prevEnd: moment.Moment | null = null;

        const currentEndIsToday = currentEnd.isSame(moment.utc(), "day");
        let universalHourCutoff: number | null = null;

        if (currentEndIsToday) {
            universalHourCutoff = moment.utc().hours();
        }

        type UiAgg = "daily" | "weekly" | "monthly" | "hourly" | "day" | "week"
            | "month"
            | "hour";

        const aggRaw = (aggregation || "hourly").toString().toLowerCase() as UiAgg;

        const aggMap: Record<UiAgg, Aggregation> = {
            daily: "day",
            day: "day",
            weekly: "week",
            week: "week",
            monthly: "month",
            month: "month",
            hourly: "hour",
            hour: "hour",
        };

        let requestedAggregation: Aggregation = aggMap[aggRaw] || "day";

        if (centralOnlyForRange && requestedAggregation === "hour") {
            requestedAggregation = "day";
        }

        const allowLiveHourly =
            includeLive && useLiveOrRecent && requestedAggregation === "hour";

        let hasComparisonRange = false;

        if (compareStartDate && compareEndDate) {
            prevStart = moment(compareStartDate);
            prevEnd = moment(compareEndDate);
            hasComparisonRange = true;
        } else if (comparison === "yesterday_same_hour") {
            prevStart = moment(currentStart).subtract(1, "days");
            prevEnd = moment(currentEnd).subtract(1, "days");
            hasComparisonRange = true;
        } else if (comparison === "previous_period") {
            const duration = currentEnd.diff(currentStart, "days") + 1;
            prevStart = moment(currentStart).subtract(duration, "days");
            prevEnd = moment(currentEnd).subtract(duration, "days");
            hasComparisonRange = true;
        }
        // 2. Clients
        let visibleClients;
        const reqClientId = req.params.clientId;

        const userId = (req as any).user?._id || null;

        if (reqClientId === "all_clients") {
            visibleClients = await fetchVisibleClients(userId, "account_summary");
        } else if (reqClientId) {
            const singleClient = await fetchClientById(reqClientId, userId);
            if (!singleClient) {
                return res
                    .status(404)
                    .json({ success: false, message: "Client not found" });
            }
            visibleClients = [singleClient];
        } else {
            visibleClients = await fetchVisibleClients(userId, "account_summary");
        }

        visibleClients = visibleClients.filter(
            (c: any) => c?.client_visible !== false
        );
        // console.log(visibleClients, "visibleClients")
        const visibleClientIds = visibleClients.map((c) => c._id.toString());
        const objectIds = visibleClientIds.map(
            (id) => new mongoose.Types.ObjectId(id),
        );

        const fetchRawHistory = async (
            s: moment.Moment,
            e: moment.Moment,
            clientIds: string[],
            opts: { centralOnly?: boolean } = {},
        ) => {
            const objectIds = clientIds.map((id) => new mongoose.Types.ObjectId(id));

            const recentDataCutoff = moment.utc().subtract(30, "days").startOf("day");
            const useCentralOnly = !!opts.centralOnly;

            const histEnd = e;

            let centralData: any[] = [];

            if (s.isSameOrBefore(histEnd)) {
                const startYear = s.year();
                const endYear = histEnd.year();
                const years: number[] = [];
                for (let y = startYear; y <= endYear; y++) years.push(y);

                const yearlyResults = await Promise.all(
                    years.map(async (year) => {
                        const yearStart = moment().year(year).startOf("year");
                        const yearEnd = moment().year(year).endOf("year");

                        const qStart = moment.max(s, yearStart);
                        const qEnd = moment.min(histEnd, yearEnd);

                        if (qStart.isAfter(qEnd)) return [];

                        const collectionName = `central_storage_${year}`;
                        const CentralStorage = getCentralStorageModel(collectionName);

                        const results = await CentralStorage.find({
                            client_id: { $in: objectIds },
                            date: {
                                $gte: moment(qStart).startOf("day").toDate(),
                                $lte: moment(qEnd).endOf("day").toDate(),
                            },
                        }).lean();


                        // ✅ FIX: Filter out hourly data from Central Storage
                        const dailyOnly = results.filter((doc: any) => {
                            const dataDate = doc.data?.date || "";
                            const isHourly =
                                typeof dataDate === "string" &&
                                dataDate.includes("T") &&
                                dataDate.includes(":");
                            return !isHourly;
                        });

                        return dailyOnly;
                    }),
                );
                centralData = yearlyResults.flat();

            }

            let accountSummaryData: any[] = [];
            if (!useCentralOnly && e.isSameOrAfter(recentDataCutoff)) {
                const recentStart = moment.max(s, recentDataCutoff);
                const recentDocs = await AccountSummary.find({
                    client_id: { $in: objectIds },
                    date: {
                        $gte: recentStart.format("YYYY-MM-DD"),
                        $lte: e.format("YYYY-MM-DD") + " 23:59",
                    },
                }).lean();

                recentDocs.forEach((doc: any) => {


                    const raw = doc.raw || {};


                    // Shopify
                    if (raw.shopify) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "shopify",
                            data: raw.shopify,
                        });
                    }

                    // GA
                    if (raw.ga) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "ga",
                            data: raw.ga,
                        });
                    }

                    // Meta
                    if (raw.meta) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "meta",
                            data: raw.meta,
                        });
                    }

                    // Adword
                    if (raw.adword) {
                        accountSummaryData.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "adword",
                            data: raw.adword,
                        });
                    }
                });
            }

            // Filter overlapping dates
            const hourlyDates = new Set(
                accountSummaryData.map((d) => moment(d.date).format("YYYY-MM-DD")),
            );
            const filteredHistorical = useCentralOnly
                ? centralData
                : centralData.filter(
                    (doc) => !hourlyDates.has(moment(doc.date).format("YYYY-MM-DD")),
                );



            return [...filteredHistorical, ...accountSummaryData];
        };


        const fetchAllRawData = async (
            s: moment.Moment,
            e: moment.Moment,
            clientIds: string[],
        ) => {
            const objectIds = clientIds.map((id) => new mongoose.Types.ObjectId(id));
            const recentDataCutoff = moment.utc().subtract(30, "days").startOf("day");


            // const histEnd = moment.min(e, recentDataCutoff.clone().subtract(1, 'second'));
            const histEnd = e;
            const hasHistorical = s.isSameOrBefore(histEnd);

            // Recent data: [max(s, recentDataCutoff), e]
            const recentStart = moment.max(s, recentDataCutoff);
            const hasRecent = e.isSameOrAfter(recentStart);

            let allRawRecords: any[] = [];

            // 1. Fetch from CentralStorage (historical daily data)
            if (hasHistorical) {
                const startYear = s.year();
                const endYear = histEnd.year();
                const years: number[] = [];
                for (let y = startYear; y <= endYear; y++) years.push(y);

                const yearlyResults = await Promise.all(
                    years.map(async (year) => {
                        const yearStart = moment().year(year).startOf("year");
                        const yearEnd = moment().year(year).endOf("year");
                        const qStart = moment.max(s, yearStart);
                        const qEnd = moment.min(histEnd, yearEnd);

                        if (qStart.isAfter(qEnd)) return [];

                        const collectionName = `central_storage_${year}`;
                        const CentralStorage = getCentralStorageModel(collectionName);

                        // Fetch raw records WITHOUT aggregation
                        const rawDocs = await CentralStorage.find({
                            client_id: { $in: objectIds },
                            date: {
                                $gte: moment(qStart).startOf("day").toDate(),
                                $lte: moment(qEnd).endOf("day").toDate(),
                            },
                        }).lean();

                        // console.log(`📦 CentralStorage ${year}: Found ${rawDocs.length} records`);

                        // ✅ FIX 2: Transform CentralStorage docs to correct format
                        // return rawDocs.map((doc: any) => ({
                        //     client_id: doc.client_id,
                        //     date: doc.date,
                        //     network: doc.network,
                        //     data: doc.data,
                        //     connection_id: doc.connection_id // Keep this for debugging
                        // }));

                        return rawDocs;
                    }),
                );

                allRawRecords.push(...yearlyResults.flat());
            }

            // 2. Fetch from AccountSummary (recent hourly data)
            if (hasRecent) {
                const recentDocs = await AccountSummary.find({
                    client_id: { $in: objectIds },
                    date: {
                        $gte: recentStart.format("YYYY-MM-DD"),
                        $lte: e.format("YYYY-MM-DD") + " 23:59",
                    },
                }).lean();



                // Convert AccountSummary format to raw record format
                recentDocs.forEach((doc: any) => {

                    const raw = doc.raw || {}; // ✅ FIXED: Changed from doc.rawData to doc.raw

                    if (raw.shopify) {
                        allRawRecords.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "shopify",
                            data: raw.shopify,
                        });
                    }
                    if (raw.ga) {

                        // console.log("🔍 AccountSummary RAW META (Full):", JSON.stringify(raw.ga, null, 2).substring(0, 500));
                        allRawRecords.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "ga",
                            data: raw.ga,
                        });
                        // console.log("🔍 AccountSummary RAW META (Keys):", Object.keys(raw.ga));
                    }
                    if (raw.meta) {
                        // console.log("🔍 AccountSummary RAW META (Keys):", Object.keys(raw.meta));
                        // console.log("🔍 AccountSummary RAW META (Full):", JSON.stringify(raw.meta, null, 2).substring(0, 500));

                        allRawRecords.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "meta",
                            data: raw.meta,
                        });
                    }
                    if (raw.adword) {
                        // console.log("🔍 AccountSummary RAW META (Keys):", Object.keys(raw.meta));
                        // console.log("🔍 AccountSummary RAW META (Full):", JSON.stringify(raw.adword, null, 2).substring(0, 500));

                        allRawRecords.push({
                            client_id: doc.client_id,
                            date: doc.date,
                            network: "adword",
                            data: raw.adword,
                        });
                    }

                });
            }

            // console.log(allRawRecords, "rawwwwrecc")

            return allRawRecords;
        };


        const getAbsoluteDateRange = (ranges: any) => {
            const allStarts = [
                currentStart,
                prevStart,
                ranges.today.start,
                ranges.yesterday.start,
                ranges.sevenDays.start,
                ranges.thirtyDays.start,
                ranges.dayBeforeYesterday.start,
                ranges.previousSevenDays.start,
                ranges.previousThirtyDays.start
            ].filter((d): d is moment.Moment => d !== null && d !== undefined);

            const allEnds = [
                currentEnd,
                prevEnd,
                ranges.today.end,
                ranges.yesterday.end,
                ranges.sevenDays.end,
                ranges.thirtyDays.end,
                ranges.dayBeforeYesterday.end,
                ranges.previousSevenDays.end,
                ranges.previousThirtyDays.end
            ].filter((d): d is moment.Moment => d !== null && d !== undefined);

            return {
                absoluteStart: moment.min(allStarts),
                absoluteEnd: moment.max(allEnds)
            };
        };

        const aggregateRawData = (
            rawRecords: any[],
            start: moment.Moment,
            end: moment.Moment,
            clientIds: string[],
            opts: { hourLimit?: number | null } = {}
        ): IAggregationResult[] => {


            // ⭐ FORCE UTC NORMALIZATION
            start = moment.utc(start);
            end = moment.utc(end);


            const clientMap = new Map<string, any>();
            let recordsProcessed = 0;
            let recordsFiltered = 0;

            rawRecords.forEach((record) => {


                // console.log(record, "teeeeeeeee")

                const clientId = record.client_id.toString();
                const recordDate = record.date;
                const network = record.network;
                const data = record.data || {};

                if (!clientIds.includes(clientId)) {
                    recordsFiltered++;
                    return;
                }
                let dateMoment: moment.Moment;
                if (typeof recordDate === 'string' && recordDate.includes(' ')) {
                    dateMoment = moment.utc(recordDate, "YYYY-MM-DD HH:mm");
                } else {
                    dateMoment = moment.utc(recordDate);
                }

                if (!dateMoment.isValid() || dateMoment.isBefore(start, 'day') || dateMoment.isAfter(end, 'day')) {
                    recordsFiltered++;
                    return;
                }
                // In aggregateRawData function:

                if (opts.hourLimit !== undefined && opts.hourLimit !== null) {
                    if (dateMoment.format("YYYY-MM-DD") === end.format("YYYY-MM-DD")) {
                        const recordHour = dateMoment.hour();
                        if (recordHour > opts.hourLimit) {
                            recordsFiltered++;
                            return;
                        }
                    }

                }

                recordsProcessed++;

                if (!clientMap.has(clientId)) {
                    clientMap.set(clientId, {
                        _id: clientId,
                        revenue: 0, spend: 0, sessions: 0, total_clicks: 0,
                        shopify_sessions: 0, shopify_gross_sales: 0, shopify_discounts: 0,
                        shopify_shipping: 0, shopify_taxes: 0, shopify_returns: 0,
                        shopify_net_sales: 0,
                        ga_revenue: 0, ga_sessions: 0,
                        meta_spend: 0, meta_clicks: 0, meta_outbound_clicks: 0,
                        meta_revenue: 0, meta_revenue_1d_view: 0, meta_revenue_7d_click: 0,
                        adword_spend: 0, adword_clicks: 0, adword_revenue: 0,
                        last_updated: "",
                        timeseries: {}
                    });
                }

                const agg = clientMap.get(clientId)!;
                const dayKey = dateMoment.format("YYYY-MM-DD");

                // Initialize daily bucket if missing
                if (!agg.timeseries![dayKey]) {
                    agg.timeseries![dayKey] = {
                        revenue: 0, spend: 0, sessions: 0, total_clicks: 0,
                        shopify_revenue: 0,
                        meta_revenue: 0, meta_spend: 0,
                        adword_revenue: 0, adword_spend: 0
                    };
                }
                const dayAgg = agg.timeseries![dayKey];
                // console.log(dayAgg, "aggregations")

                if (network === "shopify") {
                    const gross = Number(data.gross_sales || 0);
                    const discounts = Math.abs(Number(data.discounts || 0));
                    const shipping = Number(data.shipping_charges || 0);
                    const taxes = Number(data.taxes || 0);
                    const returns = Math.abs(Number(data.returns || 0));
                    const sessions = Number(data.sessions || 0);
                    const netSales = Number(data.net_sales || 0);  // ✅ ADD THIS LINE


                    agg.shopify_gross_sales += gross;
                    agg.shopify_discounts += discounts;
                    agg.shopify_shipping += shipping;
                    agg.shopify_taxes += taxes;
                    agg.shopify_returns += returns;
                    agg.shopify_sessions += sessions;
                    agg.shopify_net_sales += netSales;  // ✅ ADD THIS LINE
                    agg.sessions += sessions;

                    const netRevenue = gross - discounts + shipping + taxes - returns;
                    dayAgg.shopify_revenue += netRevenue;
                    dayAgg.revenue += netRevenue;
                    dayAgg.sessions += sessions;

                    // console.log(dayAgg.shopify_revenue, "revenue sss")

                } else if (network === "ga") {

                    let rev = 0;
                    // let sess = 0;

                    if (Array.isArray(data.channels)) {
                        data.channels.forEach((ch: any) => {
                            rev += Number(ch.revenue || ch.totalRevenue || 0);
                            // sess += Number(ch.sessions || 0);    
                        });
                    } else {
                        rev = Number(data.totalRevenue || data.revenue || 0);
                        // sess = Number(data.sessions || 0);
                    }

                    agg.ga_revenue += rev;
                    // agg.ga_sessions += sess;
                    // agg.sessions += sess;
                    agg.revenue += rev;
                }
                else if (network === "meta") {
                    const spend = Number(data.spend || 0);
                    const clicks = Number(data.outbound_clicks || data.clicks || 0);
                    const outbound = Number(data.outbound_clicks || 0);
                    const rev = Number(data.revenue || 0);
                    const rev1d = Number(data.revenue_1d_view || 0);
                    const rev7d = Number(data.revenue_7d_click || 0);

                    agg.meta_spend += spend;
                    agg.meta_clicks += clicks;
                    agg.meta_outbound_clicks += outbound;
                    agg.meta_revenue += rev;
                    agg.meta_revenue_1d_view += rev1d;
                    agg.meta_revenue_7d_click += rev7d;
                    agg.spend += spend;
                    agg.total_clicks += clicks;

                    // Daily
                    dayAgg.meta_revenue += rev;
                    dayAgg.meta_spend += spend;
                    dayAgg.revenue += rev;
                    dayAgg.spend += spend;
                    dayAgg.total_clicks += clicks;



                } else if (network === "adword") {
                    const spend = Number(data.spend || 0);
                    const clicks = Number(data.clicks || 0);
                    const rev = Number(data.revenue || 0);

                    agg.adword_spend += spend;
                    agg.adword_clicks += clicks;
                    agg.adword_revenue += rev;
                    agg.spend += spend;
                    agg.total_clicks += clicks;
                    agg.revenue += rev;

                    // Daily
                    dayAgg.adword_revenue += rev;
                    dayAgg.adword_spend += spend;
                    dayAgg.revenue += rev;
                    dayAgg.spend += spend;
                    dayAgg.total_clicks += clicks;

                }

                // Update last_updated
                if (!agg.last_updated || dateMoment.isAfter(moment.utc(agg.last_updated))) {
                    agg.last_updated = dateMoment.toISOString();
                }

            });
            // console.log(clientMap.values(), "valuesss")
            // console.log(`📊 aggregateRawData: Processed ${recordsProcessed} records, filtered ${recordsFiltered} | Range: ${start.format('YYYY-MM-DD')} to ${end.format('YYYY-MM-DD')}, hourLimit: ${opts.hourLimit}`);

            return Array.from(clientMap.values());
        };

        const hourlyRanges = getHourlyComparisonRanges();

        const todayRange = hourlyRanges.today;
        const yesterdayRange = hourlyRanges.yesterday;
        const sevenDaysRange = hourlyRanges.sevenDays;
        const thirtyDaysRange = hourlyRanges.thirtyDays;
        const dayBeforeYesterdayRange = hourlyRanges.dayBeforeYesterday;
        const previousSevenDaysRange = hourlyRanges.previousSevenDays;
        const previousThirtyDaysRange = hourlyRanges.previousThirtyDays;


        // console.log(todayRange, "todayRange")
        // console.log(yesterdayRange, "yesterdayRange")
        // console.log(sevenDaysRange, "sevenDaysRange")
        // console.log(thirtyDaysRange, "thirtyDaysRange")
        // console.log(dayBeforeYesterdayRange, "dayBeforeYesterdayRange")
        // console.log(previousSevenDaysRange, "previousSevenDaysRange")
        // console.log(previousThirtyDaysRange, "previousThirtyDaysRange")

        // Calculate absolute date range covering ALL periods
        const { absoluteStart, absoluteEnd } = getAbsoluteDateRange(hourlyRanges);


        // Step 1: Fetch ALL raw data ONCE
        const [allRawData, rawHistory, prevRawHistory] = await Promise.all([
            fetchAllRawData(absoluteStart, absoluteEnd, visibleClientIds),
            fetchRawHistory(currentStart, currentEnd, visibleClientIds, {
                centralOnly: centralOnlyForRange,
            }),
            hasComparisonRange && prevStart && prevEnd
                ? fetchRawHistory(prevStart, prevEnd, visibleClientIds, { centralOnly: true })
                : Promise.resolve([])
        ]);

        const userStart = moment.utc(startDate).startOf("day");
        const userEnd = moment.utc(endDate).endOf("day");


        const currentData = aggregateRawData(
            allRawData,
            userStart,
            userEnd,
            visibleClientIds,
            { hourLimit: currentEndIsToday ? universalHourCutoff : null }
        );

        const prevData = hasComparisonRange && prevStart && prevEnd
            ? aggregateRawData(
                allRawData,
                prevStart,
                prevEnd,
                visibleClientIds,
                { hourLimit: todayRange.hourLimit }
            )
            : [];

        const todayData = aggregateRawData(
            allRawData,
            todayRange.start,
            todayRange.end,
            visibleClientIds,
            { hourLimit: todayRange.hourLimit }
        );


        const yesterdayData = aggregateRawData(
            allRawData,
            yesterdayRange.start,
            yesterdayRange.end,
            visibleClientIds,
            { hourLimit: yesterdayRange.hourLimit }
        );

        const sevenDaysData = aggregateRawData(
            allRawData,
            sevenDaysRange.start,
            sevenDaysRange.end,
            visibleClientIds,
            { hourLimit: sevenDaysRange.hourLimit }
        );

        // console.log(sevenDaysData, "sevenDaysData")

        const thirtyDaysData = aggregateRawData(
            allRawData,
            thirtyDaysRange.start,
            thirtyDaysRange.end,
            visibleClientIds,
            { hourLimit: thirtyDaysRange.hourLimit }
        );

        // console.log(thirtyDaysData, "thirtyDaysData")



        const dayBeforeYesterdayData = aggregateRawData(
            allRawData,
            dayBeforeYesterdayRange.start,
            dayBeforeYesterdayRange.end,
            visibleClientIds,
            { hourLimit: dayBeforeYesterdayRange.hourLimit }
        );
        // console.log(dayBeforeYesterdayData, "dayBeforeYesterdayData")

        const previousSevenDaysData = aggregateRawData(
            allRawData,
            previousSevenDaysRange.start,
            previousSevenDaysRange.end,
            visibleClientIds,
            { hourLimit: previousSevenDaysRange.hourLimit }
        );

        const previousThirtyDaysData = aggregateRawData(
            allRawData,
            previousThirtyDaysRange.start,
            previousThirtyDaysRange.end,
            visibleClientIds,
            { hourLimit: previousThirtyDaysRange.hourLimit }
        );


        const currentDataMap = Object.fromEntries(
            currentData.map((item) => [item._id.toString(), item]),
        );

        const prevDataMap = Object.fromEntries(
            prevData.map((item) => [item._id.toString(), item]),
        );

        // ✅ NEW VERSION - Uses client's Shopify formula
        // ✅ NEW VERSION - Uses client's Shopify formula
        const buildMonthlyRevenueMap = (
            rows: IAggregationResult[],
            formulaMap: Map<string, string>
        ) => {
            const map: Record<string, { shopify: number; ga: number; paid: number }> = {};

            rows.forEach((r) => {
                const id = r._id.toString();
                const formula = formulaMap.get(id) || "G-D+S+T";

                const shopifyRevenue = calculateAggregatedShopifyRevenue({
                    gross_sales: (r as any).shopify_gross_sales || 0,
                    discounts: (r as any).shopify_discounts || 0,
                    shipping_charges: (r as any).shopify_shipping || 0,
                    taxes: (r as any).shopify_taxes || 0,
                    returns: (r as any).shopify_returns || 0,
                    net_sales: (r as any).shopify_net_sales || 0,
                }, formula);

                map[id] = {
                    shopify: shopifyRevenue,
                    ga: r.ga_revenue || 0,
                    paid: (r.meta_revenue || 0) + ((r as any).adword_revenue || 0),
                };
            });

            return map;
        };

        // Create clients map
        const clientsMap = new Map<string, any>();
        visibleClients.forEach(c => clientsMap.set(c._id.toString(), c));

        // ✅ Bulk Fetch Metadata (with shopify_revenue_settings)
        const allConnectionsRaw = (await ClientConnections.find({
            client_id: { $in: visibleClientIds },
        })
            .select("client_id network value token shopify_revenue_settings")  // ✅ Added
            .lean()) as any[];

        const allIntegrationsRaw = (await clientConnections.find({
            client_id: { $in: objectIds },
        })
            .select("client_id network store_url token access_token accessToken")
            .lean()) as any[];

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

        // ✅ NEW: Build Formula Map from ClientConnections (Shopify network only)
        const formulaMap = new Map<string, string>();
        visibleClientIds.forEach((clientId) => {
            const connections = connectionsMap.get(clientId) || [];

            // Find Shopify connection for this client
            const shopifyConnection = connections.find(
                (c) => c.network?.toLowerCase() === "shopify"
            );

            // Get formula from shopify_revenue_settings.account_summary
            const formula = shopifyConnection?.shopify_revenue_settings?.account_summary || "G-D+S+T";

            formulaMap.set(clientId, formula);
        });
        // console.log(formulaMap, "formulaMap")

        // ✅ Now call buildMonthlyRevenueMap (AFTER formulaMap is created)
        const todayRevMap = buildMonthlyRevenueMap(todayData, formulaMap);
        const yesterdayRevMap = buildMonthlyRevenueMap(yesterdayData, formulaMap);
        const sevenDaysRevMap = buildMonthlyRevenueMap(sevenDaysData, formulaMap);
        const thirtyDaysRevMap = buildMonthlyRevenueMap(thirtyDaysData, formulaMap);
        const dayBeforeYesterdayRevMap = buildMonthlyRevenueMap(dayBeforeYesterdayData, formulaMap);
        const previousSevenDaysRevMap = buildMonthlyRevenueMap(previousSevenDaysData, formulaMap);
        const previousThirtyDaysRevMap = buildMonthlyRevenueMap(previousThirtyDaysData, formulaMap);


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

        // console.log(`📋 Formulas loaded from ClientConnections for ${formulaMap.size} clients`);
        const clientLimit = pLimit(10);

        const clientWrapper = await Promise.all(
            visibleClients.map((client) =>
                clientLimit(async () => {
                    const cId = client._id.toString();

                    const allConnections = connectionsMap.get(cId) || [];
                    const allIntegrations = integrationsMap.get(cId) || [];
                    const shopifyFormula = formulaMap.get(cId) || "G-D+S+T";  // ✅ From cached map


                    if (allConnections.length === 0 && allIntegrations.length === 0) {
                        return null;
                    }

                    const curr = currentDataMap[cId] || ({} as any);
                    const prev = prevDataMap[cId] || ({} as any);


                    const calcCpc = (s: number, c: number) => (c > 0 ? s / c : 0);
                    const calcRoas = (r: number, s: number) => (s > 0 ? r / s : 0);

                    const networks = [];

                    for (const platform of PLATFORM_CONFIG) {
                        let connections = allConnections.filter((c) =>
                            platform.aliases.includes(c.network.toLowerCase()),
                        );
                        let integration =
                            allIntegrations.find((i) =>
                                platform.aliases.includes(i.network.toLowerCase()),
                            ) ||
                            allConnections.find((c) =>
                                platform.aliases.includes(c.network.toLowerCase()),
                            );

                        const netStat: any = { network: platform.label };

                        if (connections.length > 0) {
                            netStat.account_ids = connections.map((c) => c.value);
                            netStat.account_id = netStat.account_ids.join(", ");
                        } else if (integration) {
                            const integParams = integration as any;
                            netStat.account_id =
                                integParams.account_id || integParams.store_url;
                        }

                        if (platform.id === "meta") {


                            netStat.spend = curr.meta_spend || 0;
                            netStat.revenue = curr.meta_revenue || 0;
                            netStat.clicks = curr.meta_clicks || 0;
                            netStat.outbound_clicks = curr.meta_outbound_clicks || 0; // 🔴 NEW: Add inbound
                            netStat.cpc = calcCpc(netStat.spend, netStat.clicks);
                            netStat.roas = calcRoas(netStat.revenue, netStat.spend);



                            // 🔴 NEW: Add attribution fields
                            netStat.revenue_1d_view = curr.meta_revenue_1d_view || 0;
                            netStat.revenue_7d_click = curr.meta_revenue_7d_click || 0;
                            netStat.roas_ct = calcRoas(
                                netStat.revenue_7d_click,
                                netStat.spend,
                            );
                            netStat.roas_vt = calcRoas(
                                netStat.revenue_1d_view,
                                netStat.spend,
                            );

                            // ✅ Only add previous fields if comparison exists
                            if (hasComparisonRange) {
                                netStat.previous_revenue = prev.meta_revenue || 0;
                                netStat.previous_spend = prev.meta_spend || 0;
                                netStat.previous_clicks = prev.meta_clicks || 0;
                                netStat.previous_outbound_clicks =
                                    prev.meta_outbound_clicks || 0; // 🔴 NEW
                                netStat.previous_cpc = calcCpc(
                                    netStat.previous_spend,
                                    netStat.previous_clicks,
                                );
                                netStat.previous_roas = calcRoas(
                                    netStat.previous_revenue,
                                    netStat.previous_spend,
                                );
                            }
                        }

                        if (platform.id === "adword") {


                            netStat.revenue = curr.adword_revenue || 0;
                            netStat.spend = curr.adword_spend || 0;
                            netStat.clicks = curr.adword_clicks || 0;
                            netStat.cpc = calcCpc(netStat.spend, netStat.clicks);
                            netStat.roas = calcRoas(netStat.revenue, netStat.spend);

                            if (hasComparisonRange) {
                                netStat.previous_revenue = prev.adword_revenue || 0;
                                netStat.previous_spend = prev.adword_spend || 0;
                                netStat.previous_clicks = prev.adword_clicks || 0;
                                netStat.previous_cpc = calcCpc(
                                    netStat.previous_spend,
                                    netStat.previous_clicks,
                                );
                                netStat.previous_roas = calcRoas(
                                    netStat.previous_revenue,
                                    netStat.previous_spend,
                                );
                            }
                        }

                        if (platform.id === "ga") {
                            netStat.revenue = curr.ga_revenue || 0;
                            // netStat.sessions = curr.ga_sessions || 0;

                            if (hasComparisonRange) {
                                netStat.previous_revenue = prev.ga_revenue || 0;
                                netStat.previous_sessions = prev.ga_sessions || 0;
                            }
                        }

                        if (platform.id === "shopify") {

                            netStat.sessions = curr.shopify_sessions || 0;

                            // ✅ Calculate revenue using client's formula
                            netStat.revenue = calculateAggregatedShopifyRevenue({
                                gross_sales: curr.shopify_gross_sales || 0,
                                discounts: curr.shopify_discounts || 0,
                                shipping_charges: curr.shopify_shipping || 0,
                                taxes: curr.shopify_taxes || 0,
                                returns: curr.shopify_returns || 0,
                                net_sales: curr.shopify_net_sales || 0,  // ✅ ADD

                            }, shopifyFormula || "G-D+S+T");

                            if (hasComparisonRange) {
                                // ✅ Calculate previous revenue using same formula
                                netStat.previous_revenue = calculateAggregatedShopifyRevenue({
                                    gross_sales: prev.shopify_gross_sales || 0,
                                    discounts: prev.shopify_discounts || 0,
                                    shipping_charges: prev.shopify_shipping || 0,
                                    taxes: prev.shopify_taxes || 0,
                                    returns: prev.shopify_returns || 0,
                                    net_sales: curr.shopify_net_sales || 0,  // ✅ ADD

                                }, shopifyFormula || "G-D+S+T");
                                netStat.previous_sessions = prev.shopify_sessions || 0;
                            }
                        }

                        if (netStat.account_id) {
                            try {
                                const rawIntegration = integration as any;
                                const accessToken =
                                    rawIntegration?.token ||
                                    rawIntegration?.access_token ||
                                    rawIntegration?.accessToken;

                                const today = moment.utc().format("YYYY-MM-DD");

                                const yesterday = moment.utc().subtract(1, "days");

                                const reqStart = moment(startDate);
                                const reqEnd = moment(endDate);

                                const hourlyStart = yesterday.startOf("day");


                                let dailyData: any = {};
                                let hourlyData: any = {};
                                let dailyDataPrev: any = {};
                                let comparisonTimeseries: any = dailyDataPrev ? { ...dailyDataPrev } : {};


                                if (rawHistory.length > 0) {
                                    const relevantHistory = (rawHistory as any[]).filter(
                                        (doc: any) =>
                                            doc.client_id.toString() === cId &&
                                            ((platform.id === "meta" && ["meta"].includes(doc.network.toLowerCase())) ||
                                                (platform.id === "adword" && ["adword"].includes(doc.network.toLowerCase())) ||
                                                (platform.id === "ga" && ["ga"].includes(doc.network.toLowerCase())) ||
                                                (platform.id === "shopify" && doc.network.toLowerCase() === "shopify"))
                                    );

                                    const filteredHistory = relevantHistory.filter((doc: any) => {
                                        let dateKey = doc.date instanceof Date
                                            ? moment.utc(doc.date).format("YYYY-MM-DD")
                                            : String(doc.date);

                                        const isHourlyEntry = dateKey.includes(" ");
                                        if (allowLiveHourly && !isHourlyEntry) {
                                            const docDate = moment.utc(dateKey.split(" ")[0]);
                                            if (docDate.isSameOrAfter(hourlyStart, "day")) return false;
                                        }
                                        return true;
                                    });

                                    dailyData = buildAggregatedTimeseries(filteredHistory, platform.id, shopifyFormula);
                                }

                                if (prevRawHistory && (prevRawHistory as any[]).length > 0) {

                                    const relevantPrev = (prevRawHistory as any[]).filter(
                                        (doc: any) =>
                                            doc.client_id.toString() === cId &&
                                            (
                                                (platform.id === "meta" && doc.network?.toLowerCase?.() === "meta") ||
                                                (platform.id === "adword" && doc.network?.toLowerCase?.() === "adword") ||
                                                (platform.id === "ga" && doc.network?.toLowerCase?.() === "ga") ||
                                                (platform.id === "shopify" && doc.network?.toLowerCase?.() === "shopify")
                                            )
                                    );

                                    dailyDataPrev = buildAggregatedTimeseries(
                                        relevantPrev,
                                        platform.id,
                                        shopifyFormula
                                    );

                                    // ⭐ MOST IMPORTANT LINE
                                    comparisonTimeseries = { ...dailyDataPrev };
                                }


                                // ========================================
                                // BUILD HOURLY DATA from Live API
                                // ========================================
                                if (allowLiveHourly) {
                                    const hourlyStartDateStr = reqStart.format("YYYY-MM-DD");
                                    const hourlyEndDateStr = reqEnd.format("YYYY-MM-DD");

                                    for (const conn of connections) {
                                        const accountId = conn.value || conn.account_id;
                                        if (!accountId) continue;

                                        const cacheKey = `${platform.id}:${accountId}:${hourlyStartDateStr}:${hourlyEndDateStr}`;
                                        let raw: any = getLiveCache(cacheKey);

                                        if (!raw) {
                                            try {
                                                if (platform.id === "meta") {
                                                    const metaLib = new MetaService();
                                                    raw = await metaLib.getMetaAccountData({
                                                        accountId: accountId,
                                                        startDate: hourlyStartDateStr,
                                                        endDate: hourlyEndDateStr,
                                                        clientId: cId,
                                                        connectionId: conn._id?.toString(),
                                                        granularity: "hourly",
                                                    });
                                                } else if (platform.id === "adword") {
                                                    const adwordLib = new AdwordService();
                                                    raw = await adwordLib.adwordReport({
                                                        customerId: accountId,
                                                        startDate: hourlyStartDateStr,
                                                        endDate: hourlyEndDateStr,
                                                        clientId: cId,
                                                        connectionId: conn._id?.toString(),
                                                        granularity: "hourly",
                                                    });
                                                } else if (platform.id === "ga") {
                                                    const analytics = new analyticsDataService();
                                                    raw = await analytics.fetchAnalyticsReport({
                                                        accountId: accountId,
                                                        startDate: hourlyStartDateStr,
                                                        endDate: hourlyEndDateStr,
                                                        clientId: cId,
                                                        connectionId: conn._id?.toString(),
                                                        granularity: "hourly",
                                                    });
                                                } else if (platform.id === "shopify" && conn?.token) {
                                                    const shopify = new ShopifyService();
                                                    raw = await shopify.salesreport({
                                                        storeUrl: accountId,
                                                        accessToken: conn?.token,
                                                        startDate: hourlyStartDateStr,
                                                        endDate: hourlyEndDateStr,
                                                        clientId: cId,
                                                        connectionId: conn._id?.toString(),
                                                        granularity: "hourly",
                                                    });
                                                }

                                                if (raw) setLiveCache(cacheKey, raw);
                                            } catch (apiError: any) {
                                                console.error(`[Live API Error] ${platform.id}:`, apiError.message);
                                                continue;
                                            }
                                        }

                                        if (raw && typeof raw === "object") {
                                            Object.entries(raw).forEach(([k, v]: [string, any]) => {
                                                let formattedKey = k;

                                                if (k.includes("T")) {
                                                    const match = k.match(/(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}:\d{2}Z?/);
                                                    if (match) {
                                                        const datePart = match[1];
                                                        const utcHour = parseInt(match[2], 10);
                                                        let displayHour = utcHour;
                                                        let displayDate = datePart;

                                                        if (platform.id === "shopify") {
                                                            displayHour = utcHour;
                                                            if (displayHour < 0) {
                                                                displayHour += 24;
                                                                displayDate = moment(datePart).subtract(1, "day").format("YYYY-MM-DD");
                                                            }
                                                        }

                                                        formattedKey = `${displayDate} ${displayHour.toString().padStart(2, "0")}:00`;
                                                    }
                                                }

                                                const formatted = formatLiveDataByPlatform(platform.id, v, shopifyFormula);

                                                if (!hourlyData[formattedKey]) {
                                                    hourlyData[formattedKey] = formatted;
                                                } else {
                                                    const calc = new MetricsCalculator(shopifyFormula);
                                                    hourlyData[formattedKey] = calc.aggregate(
                                                        [hourlyData[formattedKey], formatted],
                                                        platform.id
                                                    );
                                                }
                                            });
                                        }
                                    }
                                }


                                const startMoment = moment(startDate); // ✅ Use original startDate
                                const endMoment = moment(endDate);
                                const datePatterns: any[] = [];

                                const cursor = startMoment.clone();
                                while (cursor.isSameOrBefore(endMoment, "day")) {
                                    datePatterns.push({
                                        date: {
                                            $regex: new RegExp(`^${cursor.format("YYYY-MM-DD")}`),
                                        },
                                    });
                                    cursor.add(1, "day");
                                }

                                // ========================================
                                // BUILD accountSummaryData
                                // ========================================
                                const accountSummaryData: any = {};

                                const accountSummaryDocs = await AccountSummary.find({
                                    client_id: new mongoose.Types.ObjectId(cId),
                                    date: {
                                        $gte: startDate,
                                        $lte: endDate + " 23:59"
                                    }
                                }).lean();

                                accountSummaryDocs.forEach((doc: any) => {
                                    const raw = doc.raw || {};
                                    let dateKey = String(doc.date);

                                    if (dateKey.includes(" ")) {
                                        const [datePart, timePart] = dateKey.split(" ");
                                        const hour = parseInt(timePart.split(":")[0], 10);
                                        let correctHour = hour;
                                        let correctDate = datePart;

                                        if (correctHour >= 24) {
                                            correctHour -= 24;
                                            correctDate = moment(datePart).add(1, "day").format("YYYY-MM-DD");
                                        }

                                        dateKey = `${correctDate} ${correctHour.toString().padStart(2, "0")}:00`;
                                    }

                                    let platformData = null;
                                    if (platform.id === "shopify") platformData = raw.shopify || null;
                                    else if (platform.id === "ga") platformData = raw.ga || null;
                                    else if (platform.id === "meta") platformData = raw.meta || null;
                                    else if (platform.id === "adword") platformData = raw.adword || null;

                                    if (platformData) {
                                        const formatted = formatLiveDataByPlatform(platform.id, platformData, shopifyFormula);

                                        if (!accountSummaryData[dateKey]) {
                                            accountSummaryData[dateKey] = formatted;
                                        } else {
                                            const calc = new MetricsCalculator(shopifyFormula);
                                            accountSummaryData[dateKey] = calc.aggregate(
                                                [accountSummaryData[dateKey], formatted],
                                                platform.id
                                            );
                                        }
                                    }
                                });


                                // ========================================
                                // MERGE TIMESERIES
                                // ========================================
                                const filteredDailyData: any = {};
                                Object.keys(dailyData).forEach((key) => {
                                    const dateOnly = key.split(" ")[0];
                                    const hasAccountSummaryHourly = Object.keys(accountSummaryData).some((k) => k.startsWith(dateOnly));
                                    const hasLiveHourly = Object.keys(hourlyData).some((k) => k.startsWith(dateOnly));

                                    if (!hasAccountSummaryHourly && !hasLiveHourly) {
                                        filteredDailyData[key] = dailyData[key];
                                    }
                                });

                                const hasHourlyData =
                                    Object.keys(accountSummaryData).length > 0 ||
                                    Object.keys(hourlyData).length > 0;

                                const finalDailyData = filteredDailyData;


                                netStat.timeseries = {
                                    ...finalDailyData,
                                    ...accountSummaryData,
                                    ...hourlyData,
                                };

                                (netStat as any).comparison_timeseries = comparisonTimeseries;

                                if (centralOnlyForRange) {
                                    netStat.timeseries = fillTimeseriesGaps(
                                        netStat.timeseries,
                                        currentStart,
                                        currentEnd,
                                        platform.id,
                                    );
                                }

                                netStat.timeseries = cleanTimeseriesByPlatform(
                                    netStat.timeseries,
                                    platform.id,
                                );


                                // ✅ NEW - Only overwrite if timeseries has data
                                const calc = new MetricsCalculator(shopifyFormula);
                                const timeseriesDataPoints = Object.values(netStat.timeseries).filter(
                                    (d: any) => d && !d.error
                                );

                                if (timeseriesDataPoints.length > 0) {
                                    const totals = calc.aggregate(timeseriesDataPoints, platform.id);
                                    netStat.impressions = netStat.impressions ?? totals.impressions
                                    netStat.ctr = netStat.ctr ?? totals.ctr
                                    if (!netStat.impressions) netStat.impressions = totals.impressions;
                                    if (!netStat.ctr) netStat.ctr = totals.ctr;
                                    if (!netStat.sessions) netStat.sessions = totals.sessions;

                                }

                                // ✅ Hour filter
                                let filteredTimeseries = { ...netStat.timeseries };

                                if (universalHourCutoff !== null) {
                                    filteredTimeseries = filterTimeseriesByHour(
                                        filteredTimeseries,
                                        currentEnd.format("YYYY-MM-DD"),
                                        universalHourCutoff,
                                        false,
                                    );
                                }

                                const mainChart = buildPlatformChartData(filteredTimeseries, {
                                    startDate,
                                    endDate,
                                    aggregation: requestedAggregation,
                                    platform: platform.id,
                                    hourCutoff: universalHourCutoff,
                                });

                                if (
                                    hasComparisonRange &&
                                    comparisonTimeseries &&
                                    Object.keys(comparisonTimeseries).length > 0
                                ) {
                                    let filteredComparisonTimeseries = { ...comparisonTimeseries };

                                    if (universalHourCutoff !== null && prevEnd) {
                                        filteredComparisonTimeseries = filterTimeseriesByHour(
                                            filteredComparisonTimeseries,
                                            prevEnd.format("YYYY-MM-DD"),
                                            universalHourCutoff,
                                            true,
                                        );
                                    }

                                    const comparisonChart = buildPlatformChartData(
                                        filteredComparisonTimeseries,
                                        {
                                            startDate: prevStart!.format("YYYY-MM-DD"),
                                            endDate: prevEnd!.format("YYYY-MM-DD"),
                                            aggregation: requestedAggregation,
                                            platform: platform.id,
                                            hourCutoff: universalHourCutoff,
                                        },
                                    );



                                    netStat.chart_data = {
                                        ...mainChart,
                                        comparison_labels: comparisonChart.labels,
                                        comparison_series: comparisonChart.series,
                                    };

                                    const prevDataPoints = Object.values(comparisonTimeseries).filter(
                                        (d: any) => d && !d.error
                                    );

                                    const prevTotals = calc.aggregate(prevDataPoints, platform.id);

                                    netStat.previous_revenue = prevTotals.revenue;
                                    netStat.previous_clicks = prevTotals.clicks;
                                    netStat.previous_sessions = prevTotals.sessions;
                                    netStat.previous_cpc = prevTotals.cpc;
                                    netStat.previous_roas = prevTotals.roas;

                                    // ✅ FIX
                                    netStat.previous_spend = prevTotals.spend;

                                    if (platform.id === 'meta') {
                                        netStat.previous_outbound_clicks = prevTotals.outbound_clicks;
                                    }


                                } else {
                                    netStat.chart_data = mainChart;
                                }
                            } catch (err: any) {
                                netStat.timeseries = {
                                    error: "Failed to fetch timeseries data",
                                };
                                netStat.chart_data = null;
                            }
                        } else {
                            netStat.timeseries = {};
                            netStat.chart_data = null;
                        }

                        if (connections.length > 0 || integration) {
                            networks.push(netStat);
                        }
                    }

                    const allChannelsTimeSeries: { [key: string]: any } = {};
                    const allChannelsTimeSeriesPrev: { [key: string]: any } = {};



                    // ✅ FIXED: Collect unique platform data only (prevent multi-account duplication)
                    const platformData = {
                        shopify: { current: {}, previous: {} },
                        ga: { current: {}, previous: {} },
                        meta: { current: {}, previous: {} },
                        adword: { current: {}, previous: {} },
                    };

                    // ✅ First Pass: Aggregate per platform (combines multiple accounts)
                    networks.forEach((net) => {
                        if (!net.timeseries || typeof net.timeseries !== "object") return;

                        const networkName = (net.network || "").toLowerCase();
                        let targetPlatform = null;

                        if (networkName === "shopify") targetPlatform = "shopify";
                        else if (networkName === "ga")
                            targetPlatform = "ga";
                        else if (networkName === "meta") targetPlatform = "meta";
                        else if (networkName === "adword")
                            targetPlatform = "adword";

                        if (!targetPlatform) return;

                        // ✅ Aggregate current range
                        Object.entries(net.timeseries).forEach(
                            ([dateKey, dataPoint]: [string, any]) => {
                                if (!dataPoint || dataPoint.error) return;

                                if (!platformData[targetPlatform].current[dateKey]) {
                                    platformData[targetPlatform].current[dateKey] = {
                                        revenue: 0,
                                        spend: 0,
                                        sessions: 0,
                                        clicks: 0,
                                        impressions: 0,
                                    };
                                }



                                const agg = platformData[targetPlatform].current[dateKey];
                                addToAggregation(agg, dataPoint);
                            },
                        );

                        // ✅ Aggregate comparison range
                        const tsPrev = (net as any).comparison_timeseries;
                        if (tsPrev && typeof tsPrev === "object") {
                            Object.entries(tsPrev).forEach(
                                ([dateKey, dataPoint]: [string, any]) => {
                                    if (!dataPoint || dataPoint.error) return;

                                    if (!platformData[targetPlatform].previous[dateKey]) {
                                        platformData[targetPlatform].previous[dateKey] = {
                                            revenue: 0,
                                            spend: 0,
                                            sessions: 0,
                                            clicks: 0,
                                            impressions: 0,
                                        };
                                    }

                                    const aggPrev =
                                        platformData[targetPlatform].previous[dateKey];
                                    addToAggregation(aggPrev, dataPoint);
                                },
                            );
                        }
                    });



                    // ✅ Second Pass: Build All Channels from aggregated platform data
                    const allDates = new Set<string>();
                    Object.values(platformData).forEach((p) => {
                        Object.keys(p.current).forEach((d) => allDates.add(d));
                    });

                    const calc = new MetricsCalculator(shopifyFormula);

                    allDates.forEach((dateKey) => {

                        const shopifyData = platformData.shopify.current[dateKey] || null;
                        const gaData = platformData.ga.current[dateKey] || null;
                        const metaData = platformData.meta.current[dateKey] || null;
                        const adwordData = platformData.adword.current[dateKey] || null;

                        if (shopifyData) {
                            allChannelsTimeSeries[dateKey] = shopifyData;
                        }
                        else if (gaData) {
                            allChannelsTimeSeries[dateKey] = gaData;
                        }
                        else {
                            allChannelsTimeSeries[dateKey] = calc.combineAllChannels(
                                null,
                                null,
                                metaData,
                                adwordData
                            );
                        }

                    });


                    // ✅ Comparison Range
                    const allCompDates = new Set<string>();
                    Object.values(platformData).forEach((p) => {
                        Object.keys(p.previous).forEach((d) => allCompDates.add(d));
                    });

                    allCompDates.forEach((dateKey) => {
                        allChannelsTimeSeriesPrev[dateKey] = calc.combineAllChannels(
                            platformData.shopify.previous[dateKey] || null,
                            platformData.ga.previous[dateKey] || null,
                            platformData.meta.previous[dateKey] || null,
                            platformData.adword.previous[dateKey] || null
                        );
                    });


                    // Existing code for current range
                    if (
                        !centralOnlyForRange &&
                        Object.keys(allChannelsTimeSeries).length > 0
                    ) {
                        const aggregatedCurrent = aggregateToHourly(allChannelsTimeSeries);
                        Object.keys(allChannelsTimeSeries).forEach(
                            (k) => delete allChannelsTimeSeries[k],
                        );
                        Object.assign(allChannelsTimeSeries, aggregatedCurrent);
                    }

                    // ✅ ADD THIS IF NOT EXISTS - Comparison range aggregation
                    if (
                        !centralOnlyForRange &&
                        Object.keys(allChannelsTimeSeriesPrev).length > 0
                    ) {
                        const aggregatedPrev = aggregateToHourly(allChannelsTimeSeriesPrev);
                        Object.keys(allChannelsTimeSeriesPrev).forEach(
                            (k) => delete allChannelsTimeSeriesPrev[k],
                        );
                        Object.assign(allChannelsTimeSeriesPrev, aggregatedPrev);
                    }

                    // Existing code for current range
                    if (
                        centralOnlyForRange &&
                        Object.keys(allChannelsTimeSeries).length > 0
                    ) {
                        const filledCurrent = fillTimeseriesGaps(
                            allChannelsTimeSeries,
                            currentStart,
                            currentEnd,
                        );
                        Object.keys(allChannelsTimeSeries).forEach(
                            (k) => delete allChannelsTimeSeries[k],
                        );
                        Object.assign(allChannelsTimeSeries, filledCurrent);
                    }

                    // Recalculate derived metrics for all data points
                    Object.keys(allChannelsTimeSeries).forEach((dateKey) => {
                        recalculateDerivedMetrics(allChannelsTimeSeries[dateKey], 'all_channels');
                    });


                    // ✅ ADD THIS NEW CODE - Comparison range metrics
                    Object.keys(allChannelsTimeSeriesPrev).forEach((dateKey) => {
                        const d = allChannelsTimeSeriesPrev[dateKey];
                        d.revenue = Number((d.revenue || 0).toFixed(2));
                        d.spend = Number((d.spend || 0).toFixed(2));
                        d.sessions = Number((d.sessions || 0).toFixed(2));
                        d.clicks = Number((d.clicks || 0).toFixed(2));
                        d.impressions = Number((d.impressions || 0).toFixed(2));
                        d.cpc = d.clicks > 0 ? Number((d.spend / d.clicks).toFixed(2)) : 0;
                        d.ctr =
                            d.impressions > 0
                                ? Number(((d.clicks / d.impressions) * 100).toFixed(2))
                                : 0;
                        d.roas = d.spend > 0 ? Number((d.revenue / d.spend).toFixed(2)) : 0;
                    });


                    // ✅ NEW - Force Shopify revenue priority
                    const shopifyNet = networks.find((n: any) => n.network?.toLowerCase() === "shopify");
                    const gaNet = networks.find((n: any) => n.network?.toLowerCase() === "ga");
                    const metaNet = networks.find((n: any) => n.network?.toLowerCase() === "meta");
                    const adwordNet = networks.find((n: any) => n.network?.toLowerCase() === "adword");


                    const hasShopify = networks.some(
                        (n: any) => n.network?.toLowerCase() === "shopify"
                    );

                    const hasGA = networks.some(
                        (n: any) =>
                            n.network?.toLowerCase() === "ga"
                    );

                    let finalRevenue = 0;

                    if (hasShopify) {
                        finalRevenue = num(shopifyNet?.revenue);
                    }
                    else if (hasGA) {
                        finalRevenue = num(gaNet?.revenue);
                    }
                    else {
                        finalRevenue = num(metaNet?.revenue) + num(adwordNet?.revenue);
                    }


                    // ✅ Spend & Clicks from paid platforms
                    const finalSpend = num(curr.meta_spend) + num(curr.adword_spend);
                    const finalClicks = num(metaNet?.clicks) + num(adwordNet?.clicks);

                    // ✅ Sessions: Shopify > GA
                    let finalSessions = shopifyNet
                        ? num(shopifyNet.sessions)
                        : 0;



                    const allChannelsStats: any = {
                        network: "All Channels",
                        revenue: to2(finalRevenue),
                        spend: to2(finalSpend),
                        ...(shopifyNet && { sessions: finalSessions }),
                        cpc: finalClicks > 0 ? to2(finalSpend / finalClicks) : 0,
                        roas: finalSpend > 0 ? to2(finalRevenue / finalSpend) : 0,
                        timeseries: allChannelsTimeSeries,
                        comparison_timeseries: hasComparisonRange ? allChannelsTimeSeriesPrev : {},  // ✅ ADD THIS
                        chart_data: null,
                    };


                    if (hasComparisonRange) {

                        // ✅ Revenue Priority Same As Current Logic
                        if (shopifyNet && shopifyNet.previous_revenue > 0) {
                            allChannelsStats.previous_revenue = shopifyNet.previous_revenue;
                        }
                        else if (gaNet && gaNet.previous_revenue > 0) {
                            allChannelsStats.previous_revenue = gaNet.previous_revenue;
                        }
                        else {
                            allChannelsStats.previous_revenue =
                                (metaNet?.previous_revenue || 0) +
                                (adwordNet?.previous_revenue || 0);
                        }

                        // ✅ Paid Clicks
                        allChannelsStats.previous_clicks =
                            (metaNet?.previous_clicks || 0) +
                            (adwordNet?.previous_clicks || 0);

                        // ✅ Sessions Priority Shopify > GA
                        if (shopifyNet && shopifyNet.previous_sessions > 0) {
                            allChannelsStats.previous_sessions = shopifyNet.previous_sessions;
                        }
                        else if (gaNet && gaNet.previous_sessions > 0) {
                            allChannelsStats.previous_sessions = gaNet.previous_sessions;
                        }
                        else {
                            allChannelsStats.previous_sessions = 0;
                        }

                        const prevStats = calculateStatsFromTimeseries(allChannelsTimeSeriesPrev);
                        allChannelsStats.previous_spend = prevStats.spend;

                        // ✅ Derived
                        allChannelsStats.previous_cpc =
                            allChannelsStats.previous_clicks > 0
                                ? to2(allChannelsStats.previous_spend / allChannelsStats.previous_clicks)
                                : 0;

                        allChannelsStats.previous_roas =
                            allChannelsStats.previous_spend > 0
                                ? to2(allChannelsStats.previous_revenue / allChannelsStats.previous_spend)
                                : 0;
                    }


                    let filteredAllChannels = { ...allChannelsTimeSeries };

                    if (universalHourCutoff !== null) {
                        filteredAllChannels = filterTimeseriesByHour(
                            filteredAllChannels,
                            currentEnd.format("YYYY-MM-DD"),
                            universalHourCutoff,
                            false, // ✅ Don't keep daily data for current range
                        );
                    }

                    const allMainChart = buildPlatformChartData(filteredAllChannels, {
                        startDate,
                        endDate,
                        aggregation: requestedAggregation,
                        platform: "all_channels",
                        hourCutoff: universalHourCutoff,
                    });

                    if (
                        hasComparisonRange &&
                        Object.keys(allChannelsTimeSeriesPrev).length > 0
                    ) {
                        let filteredAllChannelsPrev = { ...allChannelsTimeSeriesPrev };

                        // Apply hour cutoff filter
                        if (universalHourCutoff !== null) {
                            filteredAllChannelsPrev = filterTimeseriesByHour(
                                filteredAllChannelsPrev,
                                prevEnd.format("YYYY-MM-DD"),
                                universalHourCutoff,
                                true, // Keep daily data
                            );
                        }

                        // Remove zero-data dates
                        const nonZeroTimeseries: Record<string, any> = {};
                        Object.entries(filteredAllChannelsPrev).forEach(
                            ([dateKey, data]: [string, any]) => {
                                if (!data) return;
                                const hasData =
                                    Number(data.revenue || 0) > 0 ||
                                    Number(data.spend || 0) > 0 ||
                                    Number(data.sessions || 0) > 0 ||
                                    Number(data.clicks || 0) > 0;
                                if (hasData) {
                                    nonZeroTimeseries[dateKey] = data;
                                }
                            },
                        );

                        const comparisonDataKeys = Object.keys(nonZeroTimeseries).sort();

                        if (comparisonDataKeys.length > 0) {

                            const isComparisonDaily = comparisonDataKeys.every(
                                (key) => !key.includes(":") && !key.includes(" ")
                            );

                            const isRequestedHourly = requestedAggregation === "hour";

                            let finalComparisonTimeseries = { ...nonZeroTimeseries };
                            let finalAggregation: Aggregation = requestedAggregation;

                            // ⭐ Hour Special Case Only
                            if (
                                isComparisonDaily &&
                                isRequestedHourly &&
                                universalHourCutoff !== null
                            ) {

                                const expanded: Record<string, any> = {};
                                const hoursToExpand = universalHourCutoff + 1;

                                Object.entries(nonZeroTimeseries).forEach(([dateKey, data]) => {

                                    for (let hour = 0; hour <= universalHourCutoff; hour++) {

                                        const hourKey = `${dateKey} ${hour
                                            .toString()
                                            .padStart(2, "0")}:00`;

                                        expanded[hourKey] = {};

                                        Object.entries(data).forEach(([field, value]) => {
                                            if (typeof value === "number") {
                                                expanded[hourKey][field] = Number(
                                                    (value / hoursToExpand).toFixed(2)
                                                );
                                            }
                                        });

                                        const h = expanded[hourKey];

                                        if (h.clicks > 0 && h.spend) {
                                            h.cpc = Number((h.spend / h.clicks).toFixed(2));
                                        }

                                        if (h.spend > 0 && h.revenue) {
                                            h.roas = Number((h.revenue / h.spend).toFixed(2));
                                        }
                                    }

                                });

                                finalComparisonTimeseries = expanded;
                                finalAggregation = "hour";
                            }

                            const actualCompStart = comparisonDataKeys[0].split(" ")[0];
                            const actualCompEnd =
                                comparisonDataKeys[comparisonDataKeys.length - 1].split(" ")[0];

                            const allComparisonChart = buildPlatformChartData(
                                finalComparisonTimeseries,
                                {
                                    startDate: actualCompStart,
                                    endDate: actualCompEnd,
                                    aggregation: finalAggregation,
                                    platform: "all_channels",
                                    hourCutoff: finalAggregation === "hour" ? universalHourCutoff : null,
                                }
                            );


                            const currentLabelCount = allMainChart.labels.length;

                            allChannelsStats.chart_data = {
                                ...allMainChart,
                                comparison_labels: allComparisonChart.labels,
                                comparison_series: allComparisonChart.series,
                            };

                        } else {
                            allChannelsStats.chart_data = allMainChart;
                        }

                    } else {
                        allChannelsStats.chart_data = allMainChart;
                    }

                    networks.unshift(allChannelsStats);



                    const pickMonthlyRevenue = (
                        revMap,
                        clientId
                    ) => {

                        const row = revMap[clientId];
                        if (!row) return 0;

                        const clientConnections = connectionsMap.get(clientId) || [];
                        const clientIntegrations = integrationsMap.get(clientId) || [];

                        const networks = [
                            ...clientConnections.map(c => c.network?.toLowerCase()),
                            ...clientIntegrations.map(i => i.network?.toLowerCase())
                        ];

                        if (networks.some(n => n?.includes("shopify"))) return row.shopify;
                        if (networks.some(n => n?.includes("ga"))) return row.ga;

                        return row.paid;
                    };




                    const todayRev = allChannelsStats.revenue || 0;
                    const yesterdayRev = allChannelsStats.previous_revenue || 0;


                    const [
                        todayRevenue,
                        yesterdayRevenue,
                        dayBeforeYesterdayRevenue,
                        sevenDaysRevenue,
                        previousSevenDaysRevenue,
                        thirtyDaysRevenue,
                        previousThirtyDaysRevenue
                    ] = ([
                        pickMonthlyRevenue(todayRevMap, cId),
                        pickMonthlyRevenue(yesterdayRevMap, cId),
                        pickMonthlyRevenue(dayBeforeYesterdayRevMap, cId),
                        pickMonthlyRevenue(sevenDaysRevMap, cId),
                        pickMonthlyRevenue(previousSevenDaysRevMap, cId),
                        pickMonthlyRevenue(thirtyDaysRevMap, cId),
                        pickMonthlyRevenue(previousThirtyDaysRevMap, cId)
                    ]);


                    // console.log(sevenDaysRevenue, "uuuuuuuuuuuuuuuuuuuu")

                    const monthly_stats = {
                        today: todayRevenue,
                        yesterday: yesterdayRevenue,
                        "7days": sevenDaysRevenue,
                        "30days": thirtyDaysRevenue,

                        difference: {
                            today: buildDiff(todayRevenue, yesterdayRevenue),
                            yesterday: buildDiff(yesterdayRevenue, dayBeforeYesterdayRevenue),
                            "7days": buildDiff(sevenDaysRevenue, previousSevenDaysRevenue),
                            "30days": buildDiff(thirtyDaysRevenue, previousThirtyDaysRevenue),
                        }
                    };

                    // console.log(monthly_stats, "monthly_stats")
                    const overallRevenue = todayRev; // Already calculated from monthly maps
                    const previousRevenue = yesterdayRev; // Already calculated from monthly maps

                    const overallSpend =
                        (curr.meta_spend || 0) + (curr.adword_spend || 0);

                    const overallClicks =
                        (curr.meta_clicks || 0) + (curr.adword_clicks || 0);

                    const previousSpend =
                        (prev.meta_spend || 0) + (prev.adword_spend || 0);

                    const overall_stats: any = {
                        revenue: overallRevenue,
                        spend: overallSpend,
                        ...(shopifyNet && { sessions: curr.shopify_sessions || 0 }),
                        total_clicks: overallClicks,
                        cpc: calcCpc(overallSpend, overallClicks),
                        roas: calcRoas(overallRevenue, overallSpend),
                    };

                    if (hasComparisonRange) {
                        overall_stats.previous_revenue = previousRevenue;
                        overall_stats.previous_spend = previousSpend;
                    }
                    return {
                        client_id: cId,
                        client_name: client.name,
                        status: client.status,
                        overall_stats,
                        networks,
                        monthly_stats,
                    };
                }),
            ),
        );

        const validClientWrapper = clientWrapper.filter(
            (client) => client !== null,
        );

        // ✅ Get latest updated_at from AccountSummary collection
        const latestAccountSummary = await AccountSummary.findOne({})
            .sort({ updated_at: -1 }) // Latest first
            .select("updated_at")
            .lean();

        const finalLastUpdated = latestAccountSummary?.updated_at
            ? new Date(latestAccountSummary.updated_at)
            : new Date();

        // console.log('🕐 Last Updated from AccountSummary:', finalLastUpdated);
        const hiddenClientDocs = await HideClient.find()
            .select("client_ids")
            .lean();
        const hiddenClientIds = new Set<string>();

        hiddenClientDocs.forEach((doc) => {
            if (doc.client_ids && Array.isArray(doc.client_ids)) {
                doc.client_ids.forEach((id: any) => {
                    hiddenClientIds.add(id.toString());
                });
            }
        });

        const filteredClientWrapper = validClientWrapper.filter((client) => {
            return !hiddenClientIds.has(client.client_id);
        });


        const allClientsData: any = {
            client_id: "all_clients",
            client_name: "All Clients",
            status: "combined",
            overall_stats: {
                revenue: 0,
                spend: 0,
                sessions: 0,
                total_clicks: 0,
                cpc: 0,
                roas: 0,
            },
            monthly_stats: {
                today: 0,
                yesterday: 0,
                "7days": 0,
                "30days": 0,
                _prev: {
                    yesterday_for_today: { total: 0, value: 0 },
                    dayBeforeYesterday_for_yesterday: { total: 0, value: 0 },
                    previousSevenDays: { total: 0, value: 0 },
                    previousThirtyDays: { total: 0, value: 0 },
                },
            },
            networks: [],
        };

        // ✅ Initialize previous fields only if comparison exists
        if (hasComparisonRange) {
            allClientsData.overall_stats.previous_revenue = 0;
            allClientsData.overall_stats.previous_spend = 0;
        }

        // ✅ SINGLE LOOP - Saare clients se data jama karo
        filteredClientWrapper.forEach((client: any) => {
            // ⚠️ Skip null/undefined clients
            if (!client) return;

            // ✅ Overall stats aggregate karo
            if (client.overall_stats) {
                allClientsData.overall_stats.revenue += Number(
                    client.overall_stats.revenue || 0,
                );
                allClientsData.overall_stats.spend += Number(
                    client.overall_stats.spend || 0,
                );
                allClientsData.overall_stats.sessions += Number(
                    client.overall_stats.sessions || 0,
                );
                allClientsData.overall_stats.total_clicks += Number(
                    client.overall_stats.total_clicks || 0,
                );

                if (hasComparisonRange) {
                    allClientsData.overall_stats.previous_revenue += Number(
                        client.overall_stats.previous_revenue || 0,
                    );
                    allClientsData.overall_stats.previous_spend += Number(
                        client.overall_stats.previous_spend || 0,
                    );
                }
            }

            // ⚠️ Skip if monthly_stats missing
            if (!client.monthly_stats) return;

            // ✅ Monthly stats aggregate karo
            allClientsData.monthly_stats.today += Number(
                client.monthly_stats.today || 0,
            );
            allClientsData.monthly_stats.yesterday += Number(
                client.monthly_stats.yesterday || 0,
            );
            allClientsData.monthly_stats["7days"] += Number(
                client.monthly_stats["7days"] || 0,
            );
            allClientsData.monthly_stats["30days"] += Number(
                client.monthly_stats["30days"] || 0,
            );

            const diff = client.monthly_stats.difference;
            if (diff) {
                if (diff.today) {
                    allClientsData.monthly_stats._prev.yesterday_for_today.total +=
                        Number(diff.today.total || 0);
                    allClientsData.monthly_stats._prev.yesterday_for_today.value +=
                        Math.abs(Number(diff.today.value || 0));
                }

                if (diff.yesterday) {
                    allClientsData.monthly_stats._prev.dayBeforeYesterday_for_yesterday.total +=
                        Number(diff.yesterday.total || 0);
                    allClientsData.monthly_stats._prev.dayBeforeYesterday_for_yesterday.value +=
                        Math.abs(Number(diff.yesterday.value || 0));
                }

                if (diff["7days"]) {
                    allClientsData.monthly_stats._prev.previousSevenDays.total += Number(
                        diff["7days"].total || 0,
                    );
                    allClientsData.monthly_stats._prev.previousSevenDays.value +=
                        Math.abs(Number(diff["7days"].value || 0));
                }

                if (diff["30days"]) {
                    allClientsData.monthly_stats._prev.previousThirtyDays.total += Number(
                        diff["30days"].total || 0,
                    );
                    allClientsData.monthly_stats._prev.previousThirtyDays.value +=
                        Math.abs(Number(diff["30days"].value || 0));
                }
            }
            // ✅ FIX: Networks BAHAR nikala — ab diff na ho tab bhi chalega

            if (client.networks && Array.isArray(client.networks)) {
                client.networks.forEach((net: any) => {
                    if (!net || !net.network) return;

                    let existing = allClientsData.networks.find(
                        (n: any) => n.network === net.network,
                    );
                    if (!existing) {
                        existing = {
                            network: net.network,
                            revenue: 0,
                            spend: 0,
                            clicks: 0,
                            outbound_clicks: 0,
                            sessions: 0,
                            impressions: 0,
                            cpc: 0,
                            ctr: 0,
                            roas: 0,
                            revenue_7d_click: 0,
                            revenue_1d_view: 0,
                            roas_ct: 0,
                            roas_vt: 0,
                            timeseries: {},
                            comparison_timeseries: {},
                        };

                        if (hasComparisonRange) {
                            existing.previous_revenue = 0;
                            existing.previous_spend = 0;
                            existing.previous_clicks = 0;
                            existing.previous_outbound_clicks = 0;
                            existing.previous_sessions = 0;
                        }

                        allClientsData.networks.push(existing);
                    }

                    existing.revenue += Number(net.revenue || 0);
                    existing.spend += Number(net.spend || 0);
                    existing.clicks += Number(net.clicks || 0);
                    existing.outbound_clicks += Number(net.outbound_clicks || 0);
                    existing.sessions += Number(net.sessions || 0);
                    existing.impressions += Number(net.impressions || 0);
                    existing.revenue_7d_click += Number(net.revenue_7d_click || 0);
                    existing.revenue_1d_view += Number(net.revenue_1d_view || 0);

                    // Aggregate Timeseries
                    if (net.timeseries && typeof net.timeseries === "object") {
                        Object.entries(net.timeseries).forEach(
                            ([dateKey, dp]: [string, any]) => {
                                if (!dp || dp.error) return;

                                if (!existing.timeseries[dateKey]) {
                                    existing.timeseries[dateKey] = {
                                        revenue: 0, spend: 0, clicks: 0,
                                        outbound_clicks: 0, sessions: 0,
                                        impressions: 0, revenue_7d_click: 0,
                                        revenue_1d_view: 0,
                                    };
                                }
                                const e = existing.timeseries[dateKey];
                                e.revenue += Number(dp.revenue || 0);
                                e.spend += Number(dp.spend || 0);
                                e.clicks += Number(dp.clicks || 0);
                                e.outbound_clicks += Number(dp.outbound_clicks || 0);
                                e.sessions += Number(dp.sessions || 0);
                                e.impressions += Number(dp.impressions || 0);
                                e.revenue_7d_click += Number(dp.revenue_7d_click || 0);
                                e.revenue_1d_view += Number(dp.revenue_1d_view || 0);
                            },
                        );
                    }

                    // Aggregate Comparison Timeseries
                    if (
                        hasComparisonRange &&
                        net.comparison_timeseries &&
                        typeof net.comparison_timeseries === "object"
                    ) {
                        Object.entries(net.comparison_timeseries).forEach(
                            ([dateKey, dp]: [string, any]) => {
                                if (!dp || dp.error) return;

                                if (net.comparison_timeseries) {
                                    Object.entries(net.comparison_timeseries).forEach(([dateKey, dp]) => {

                                        if (!existing.comparison_timeseries[dateKey]) {
                                            existing.comparison_timeseries[dateKey] = {
                                                revenue: 0,
                                                spend: 0,
                                                clicks: 0,
                                                sessions: 0,
                                                impressions: 0
                                            };
                                        }

                                        addToAggregation(existing.comparison_timeseries[dateKey], dp);

                                    });
                                }

                                const e = existing.comparison_timeseries[dateKey];
                                e.revenue += Number(dp.revenue || 0);
                                e.spend += Number(dp.spend || 0);
                                e.clicks += Number(dp.clicks || 0);
                                e.outbound_clicks += Number(dp.outbound_clicks || 0);
                                e.sessions += Number(dp.sessions || 0);
                                e.impressions += Number(dp.impressions || 0);
                                e.revenue_7d_click += Number(dp.revenue_7d_click || 0);
                                e.revenue_1d_view += Number(dp.revenue_1d_view || 0);
                            },
                        );
                    }

                    if (hasComparisonRange) {
                        existing.previous_revenue += Number(net.previous_revenue || 0);
                        existing.previous_spend += Number(net.previous_spend || 0);
                        existing.previous_clicks += Number(net.previous_clicks || 0);
                        existing.previous_outbound_clicks += Number(net.previous_outbound_clicks || 0);
                        existing.previous_sessions += Number(net.previous_sessions || 0);
                    }
                });
            }

        });



        // Helper to derive previous value from total (since total = current + previous)
        const getPrev = (curr: number, totalObj: any) => {
            const total = Number(totalObj?.total || 0);
            return total - curr;
        };

        allClientsData.monthly_stats.difference = {
            today: buildDiff(
                allClientsData.monthly_stats.today,
                getPrev(allClientsData.monthly_stats.today, allClientsData.monthly_stats._prev.yesterday_for_today)
            ),
            yesterday: buildDiff(
                allClientsData.monthly_stats.yesterday,
                getPrev(allClientsData.monthly_stats.yesterday, allClientsData.monthly_stats._prev.dayBeforeYesterday_for_yesterday)
            ),
            "7days": buildDiff(
                allClientsData.monthly_stats["7days"],
                getPrev(allClientsData.monthly_stats["7days"], allClientsData.monthly_stats._prev.previousSevenDays)
            ),
            "30days": buildDiff(
                allClientsData.monthly_stats["30days"],
                getPrev(allClientsData.monthly_stats["30days"], allClientsData.monthly_stats._prev.previousThirtyDays)
            ),
        };

        // ✅ Helper function — network label ko platform ID mein convert karo
        const networkLabelToPlatformId = (label: string): string => {
            const lower = (label || "").toLowerCase().trim();
            if (lower === "all channels") return "all_channels";
            if (lower === "meta" || lower === "facebook") return "meta";
            if (lower === "google ads" || lower === "adword" || lower === "adwords") return "adword";
            if (lower === "ga" || lower === "google analytics" || lower === "ga4") return "ga";
            if (lower === "shopify") return "shopify";
            return lower.replace(/\s+/g, "_");
        };

        allClientsData.networks.forEach((net: any) => {
            if (!net) return;

            const safeDiv = (n: number, d: number) =>
                d > 0 ? Number((n / d).toFixed(2)) : 0;

            const spd = Number(net.spend || 0);
            const rev = Number(net.revenue || 0);
            const clks = Number(net.clicks || 0);
            const imps = Number(net.impressions || 0);

            // ✅ Round raw metrics
            net.revenue = Number(rev.toFixed(2));
            net.spend = Number(spd.toFixed(2));
            net.clicks = Number(clks.toFixed(2));
            net.sessions = Number(Number(net.sessions || 0).toFixed(2));
            net.impressions = Number(imps.toFixed(2));

            // ✅ Recalculate ALL derived metrics
            net.cpc = safeDiv(spd, clks);
            net.roas = safeDiv(rev, spd);
            net.ctr = safeDiv(clks * 100, imps);

            // ✅ Meta-specific
            if (String(net.network).toLowerCase() === "meta") {
                const rev7Click = Number(net.revenue_7d_click || 0);
                const rev1View = Number(net.revenue_1d_view || 0);
                net.revenue_7d_click = Number(rev7Click.toFixed(2));
                net.revenue_1d_view = Number(rev1View.toFixed(2));
                net.roas_ct = safeDiv(rev7Click, spd);
                net.roas_vt = safeDiv(rev1View, spd);
            }

            // ✅ Previous period derived metrics
            if (hasComparisonRange) {
                const prevSpd = Number(net.previous_spend || 0);
                const prevRev = Number(net.previous_revenue || 0);
                const prevClks = Number(net.previous_clicks || 0);

                net.previous_revenue = Number(prevRev.toFixed(2));
                net.previous_spend = Number(prevSpd.toFixed(2));
                net.previous_clicks = Number(prevClks.toFixed(2));
                net.previous_cpc = safeDiv(prevSpd, prevClks);
                net.previous_roas = safeDiv(prevRev, prevSpd);
            }

            // ✅ Recalculate derived metrics in EACH timeseries data point
            if (net.timeseries && typeof net.timeseries === "object") {
                Object.values(net.timeseries).forEach((dp: any) => {
                    if (!dp) return;
                    dp.revenue = Number((dp.revenue || 0).toFixed(2));
                    dp.spend = Number((dp.spend || 0).toFixed(2));
                    dp.cpc = dp.clicks > 0 ? Number((dp.spend / dp.clicks).toFixed(2)) : 0;
                    dp.roas = dp.spend > 0 ? Number((dp.revenue / dp.spend).toFixed(2)) : 0;
                    dp.ctr = dp.impressions > 0
                        ? Number(((dp.clicks / dp.impressions) * 100).toFixed(2))
                        : 0;
                });
            }

            // ✅ Same for comparison timeseries
            if (net.comparison_timeseries && typeof net.comparison_timeseries === "object") {
                Object.values(net.comparison_timeseries).forEach((dp: any) => {
                    if (!dp) return;
                    dp.revenue = Number((dp.revenue || 0).toFixed(2));
                    dp.spend = Number((dp.spend || 0).toFixed(2));
                    dp.cpc = dp.clicks > 0 ? Number((dp.spend / dp.clicks).toFixed(2)) : 0;
                    dp.roas = dp.spend > 0 ? Number((dp.revenue / dp.spend).toFixed(2)) : 0;
                    dp.ctr = dp.impressions > 0
                        ? Number(((dp.clicks / dp.impressions) * 100).toFixed(2))
                        : 0;
                });
            }

            // ✅ BUILD CHART DATA with correct platform ID
            if (net.timeseries) {
                let filteredTs = { ...net.timeseries };

                if (universalHourCutoff !== null) {
                    filteredTs = filterTimeseriesByHour(
                        filteredTs,
                        currentEnd.format("YYYY-MM-DD"),
                        universalHourCutoff,
                    );
                }

                // ✅ FIX: Convert "Meta" → "meta", "All Channels" → "all_channels"
                const platformId = networkLabelToPlatformId(net.network);

                const chart = buildPlatformChartData(filteredTs, {
                    startDate,
                    endDate,
                    aggregation: requestedAggregation,
                    platform: platformId,
                    hourCutoff: universalHourCutoff,
                });

                let comparisonChart = null;

                if (
                    hasComparisonRange &&
                    net.comparison_timeseries &&
                    Object.keys(net.comparison_timeseries).length > 0
                ) {
                    let filteredCompTs = { ...net.comparison_timeseries };

                    if (universalHourCutoff !== null && prevEnd) {
                        filteredCompTs = filterTimeseriesByHour(
                            filteredCompTs,
                            prevEnd.format("YYYY-MM-DD"),
                            universalHourCutoff,
                        );
                    }

                    if (prevStart && prevEnd) {
                        comparisonChart = buildPlatformChartData(filteredCompTs, {
                            startDate:
                                compareStartDate ||
                                (prevStart ? prevStart.format("YYYY-MM-DD") : startDate),

                            endDate:
                                compareEndDate ||
                                (prevEnd ? prevEnd.format("YYYY-MM-DD") : endDate),

                            aggregation: requestedAggregation,
                            platform: platformId,
                            hourCutoff: universalHourCutoff,
                        });

                    }

                }

                net.chart_data = {
                    ...chart,
                    comparison_labels: comparisonChart ? comparisonChart.labels : [],
                    comparison_series: comparisonChart ? comparisonChart.series : [],
                };

                delete net.timeseries;
                delete net.comparison_timeseries;
            }
        });

        // ✅ FINAL CALCULATIONS
        allClientsData.overall_stats.revenue = Number(
            allClientsData.overall_stats.revenue.toFixed(2),
        );
        allClientsData.overall_stats.spend = Number(
            allClientsData.overall_stats.spend.toFixed(2),
        );
        allClientsData.overall_stats.cpc =
            allClientsData.overall_stats.total_clicks > 0
                ? Number(
                    (
                        allClientsData.overall_stats.spend /
                        allClientsData.overall_stats.total_clicks
                    ).toFixed(2),
                )
                : 0;
        allClientsData.overall_stats.roas =
            allClientsData.overall_stats.spend > 0
                ? Number(
                    (
                        allClientsData.overall_stats.revenue /
                        allClientsData.overall_stats.spend
                    ).toFixed(2),
                )
                : 0;

        allClientsData.monthly_stats.today = Number(
            allClientsData.monthly_stats.today.toFixed(2),
        );
        allClientsData.monthly_stats.yesterday = Number(
            allClientsData.monthly_stats.yesterday.toFixed(2),
        );
        allClientsData.monthly_stats["7days"] = Number(
            allClientsData.monthly_stats["7days"].toFixed(2),
        );
        allClientsData.monthly_stats["30days"] = Number(
            allClientsData.monthly_stats["30days"].toFixed(2),
        );

        delete allClientsData.monthly_stats._prev;

        // ✅ ADD TO FRONT - Sabse upar laga do (SIRF EK BAAR!)
        filteredClientWrapper.unshift(allClientsData);

        // ✅ CLEANUP TIMESERIES from all clients
        filteredClientWrapper.forEach((client) => {
            if (client.networks && Array.isArray(client.networks)) {
                client.networks = client.networks.map((n) => {
                    const cleaned = { ...n };
                    delete cleaned.timeseries;
                    delete cleaned.comparison_timeseries;
                    return cleaned;
                });
            }
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // console.log(`[Performance] Account Summary API completed in ${duration}s`);

        if (req.params.clientId === "all_clients") {
            const allClients = filteredClientWrapper.find(
                (c: any) => c.client_id === "all_clients",
            );
            if (allClients) {
                return res.status(200).json({
                    status_code: 200,
                    success: true,
                    message: "All clients summary",
                    data: [allClients],
                    last_updated: finalLastUpdated,
                });
            }
        }



        res.status(200).json({
            status_code: 200,
            success: true,
            message: "Account summary fetched successfully",
            data: filteredClientWrapper,
            last_updated: finalLastUpdated,
        });
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(
            `[Error] Account Summary API failed after ${duration}s:`,
            error,
        );
        res.status(500).json({
            status_code: 500,
            success: false,
            message: "Failed to fetch summary",
            error,
        });
    }
};



import PerformanceEntitiesSchema from "../db/models/performanceEntity";
import PerformanceClientDetail from "../db/models/performanceClientDetail";
import HideClient from "../db/models/hideClient";
import clientConnections from "../db/models/clientConnections";


export const getAllPerformanceEntities = async (
    req: Request,
    res: Response,
) => {
    try {
        const { client_id, status } = req.query;

        const filter: any = {
            status: { $ne: "inactive" }   // ⭐ Default remove inactive
        };

        if (client_id) {
            if (!mongoose.Types.ObjectId.isValid(client_id as string)) {
                return res.status(400).json({
                    status_code: 400,
                    success: false,
                    message: "Invalid client_id format",
                    data: null,
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
                data: [],
            });
        }

        // Group by group_name
        const grouped: Record<string, any[]> = {};

        entities.forEach((item) => {
            const cleaned = {
                entity_id: item._id, // Map correctly to entity_id
                // client_id: item.client_id,
                entity_name: item.entity_name,
                meta: item.meta || null,
                adword: item.adword || null,
            };

            if (!grouped[item.group_name]) grouped[item.group_name] = [];
            grouped[item.group_name].push(cleaned);
        });

        // Format result
        const finalResult = Object.entries(grouped).map(([group_name, data]) => ({
            group_name,
            data,
        }));

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: "Performance entities fetched successfully",
            data: finalResult,
        });
    } catch (error: any) {
        return res.status(500).json({
            status_code: 500,
            success: false,
            message: "Failed to fetch performance entities",
            data: error.message,
        });
    }
};


export const getSportPerformanceReportv2 = async (
    req: Request,
    res: Response,
) => {
    const startTime = Date.now();

    try {
        const {
            client_id,
            start_date,
            end_date,
            compare_start_date,
            compare_end_date,
            group,
            entity_ids,
            aggregation, // <-- NEW
        } = req.body || {};

        // ---------- BASIC VALIDATION ----------
        if (!client_id || !mongoose.Types.ObjectId.isValid(client_id)) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "Invalid client_id",
            });
        }

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "start_date and end_date are required (YYYY-MM-DD)",
            });
        }

        // ---------- AGGREGATION NORMALIZATION (for charts) ----------
        type AggType = "daily" | "weekly" | "monthly";

        const aggRaw = (aggregation || "daily").toString().toLowerCase();
        const aggType: AggType = ["daily", "weekly", "monthly"].includes(
            aggRaw as AggType,
        )
            ? (aggRaw as AggType)
            : "daily";

        const mainStart = moment(start_date, "YYYY-MM-DD", true);
        const mainEnd = moment(end_date, "YYYY-MM-DD", true);

        if (!mainStart.isValid() || !mainEnd.isValid()) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "Invalid start_date/end_date format, expected YYYY-MM-DD",
            });
        }
        if (mainStart.isAfter(mainEnd)) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "start_date cannot be after end_date",
            });
        }

        // ---------- COMPARE RANGE (OPTIONAL) ----------
        let hasCompareRange = false;
        let compStart: moment.Moment | null = null;
        let compEnd: moment.Moment | null = null;

        if (compare_start_date || compare_end_date) {
            // agar ek bhi aa gaya, dono chaiye
            if (!compare_start_date || !compare_end_date) {
                return res.status(400).json({
                    success: false,
                    status_code: 400,
                    message:
                        "Both compare_start_date and compare_end_date are required when using comparison",
                });
            }

            compStart = moment(compare_start_date, "YYYY-MM-DD", true);
            compEnd = moment(compare_end_date, "YYYY-MM-DD", true);

            if (!compStart.isValid() || !compEnd.isValid()) {
                return res.status(400).json({
                    success: false,
                    status_code: 400,
                    message:
                        "Invalid compare_start_date/compare_end_date format, expected YYYY-MM-DD",
                });
            }
            if (compStart.isAfter(compEnd)) {
                return res.status(400).json({
                    success: false,
                    status_code: 400,
                    message: "compare_start_date cannot be after compare_end_date",
                });
            }

            hasCompareRange = true;
        }

        // ---------- CLIENT ----------
        const client = await fetchClientById(client_id);
        if (!client) {
            return res.status(404).json({
                success: false,
                status_code: 404,
                message: "Client not found",
            });
        }

        // ---------- FILTER NORMALIZATION ----------
        const groupRaw = (group || "").toString().trim();
        const groupNorm = groupRaw.toLowerCase();
        const hasGroupFilter = !!groupRaw && groupNorm !== "all";

        const excludedIds = new Set<string>(
            Array.isArray(entity_ids) ? entity_ids.map((id: any) => String(id)) : [],
        );
        const hasEntityFilter = excludedIds.size > 0;

        const hasAnyFilter = hasGroupFilter || hasEntityFilter;

        // ---------- LOAD ENTITIES (NAME -> ID MAP) ----------
        const entityDocs = await PerformanceEntitiesSchema.find({
            client_id: new mongoose.Types.ObjectId(client_id),
            status: "active",
        }).lean();

        // entityNameMap[groupNorm][entityNorm] = entityId
        const entityNameMap: Record<string, Record<string, string>> = {};
        entityDocs.forEach((ent: any) => {
            const g = String(ent.group_name || "").toLowerCase();
            const en = String(ent.entity_name || "").toLowerCase();
            if (!g || !en) return;
            if (!entityNameMap[g]) entityNameMap[g] = {};
            entityNameMap[g][en] = String(ent._id);
        });

        // ---------- GLOBAL MONTH RANGE (MAIN + COMPARE DONO KA UNION, AGAR COMPARE HAI) ----------
        const globalStart = hasCompareRange
            ? moment.min(mainStart.clone(), compStart!.clone())
            : mainStart.clone();

        const globalEnd = hasCompareRange
            ? moment.max(mainEnd.clone(), compEnd!.clone())
            : mainEnd.clone();

        const monthKeys: string[] = [];
        const curMonth = globalStart.clone().startOf("month");
        const endMonth = globalEnd.clone().startOf("month");
        while (curMonth.isSameOrBefore(endMonth, "month")) {
            monthKeys.push(curMonth.format("YYYY-MM"));
            curMonth.add(1, "month");
        }

        // ---------- SNAPSHOTS LOAD ----------
        const snapshots = await PerformanceClientDetail.find({
            client_id: new mongoose.Types.ObjectId(client_id),
            year_month: { $in: monthKeys },
        }).lean();

        if (!snapshots.length) {
            return res.status(422).json({
                success: false,
                status_code: 422,
                message:
                    "No performance snapshot found for this client and date ranges. Please ensure cron has run.",
            });
        }

        type DailyMetric = {
            revenue: number;
            spend: number;
            clicks: number;
            outbound_clicks?: number;
            revenue_7d_click?: number;
            revenue_1d_view?: number;
        };
        type DailyRev = { revenue: number; sessions?: number };


        const aggregateTimeseries = (
            labels: string[],
            allSeries: {
                channel_revenue: number[];
                shopify_revenue: number[];
                spend: number[];
                sessions: number[];
                total_clicks: number[];
            },
            metaSeries: {
                revenue: number[];
                spend: number[];
                clicks: number[];
                outbound_clicks: number[];
            },
            adwordSeries: {
                revenue: number[];
                spend: number[];
                clicks: number[];
                outbound_clicks: number[];
            },
            agg: AggType,
        ) => {
            if (agg === "daily") {
                // Calculate ROAS/CPC for daily
                const dailyAll = {
                    ...allSeries,
                    roas: allSeries.spend.map((spd, i) =>
                        spd > 0
                            ? Number((allSeries.channel_revenue[i] / spd).toFixed(2))
                            : 0,
                    ),
                    cpc: allSeries.total_clicks.map((clk, i) =>
                        clk > 0 ? Number((allSeries.spend[i] / clk).toFixed(2)) : 0,
                    ),
                };

                const dailyMeta = {
                    ...metaSeries,
                    roas: metaSeries.spend.map((spd, i) =>
                        spd > 0 ? Number((metaSeries.revenue[i] / spd).toFixed(2)) : 0,
                    ),
                    cpc: metaSeries.clicks.map((clk, i) =>
                        clk > 0 ? Number((metaSeries.spend[i] / clk).toFixed(2)) : 0,
                    ),
                };

                const dailyAdword = {
                    ...adwordSeries,
                    roas: adwordSeries.spend.map((spd, i) =>
                        spd > 0 ? Number((adwordSeries.revenue[i] / spd).toFixed(2)) : 0,
                    ),
                    cpc: adwordSeries.clicks.map((clk, i) =>
                        clk > 0 ? Number((adwordSeries.spend[i] / clk).toFixed(2)) : 0,
                    ),
                };

                return {
                    labels,
                    allSeries: dailyAll,
                    metaSeries: dailyMeta,
                    adwordSeries: dailyAdword,
                };
            }

            type DayPoint = {
                channel_revenue: number;
                shopify_revenue: number;
                spend: number;
                sessions: number;
                total_clicks: number;
                meta_revenue: number;
                meta_spend: number;
                meta_clicks: number;
                meta_outbound_clicks: number; // 🔴 NEW
                ad_revenue: number;
                ad_spend: number;
                ad_clicks: number;
            };

            const bucketMap: Record<string, DayPoint> = {};

            labels.forEach((dateStr, i) => {
                const m = moment(dateStr, "YYYY-MM-DD");
                if (!m.isValid()) return;

                const dayPoint: DayPoint = {
                    channel_revenue: allSeries.channel_revenue[i] || 0,
                    shopify_revenue: allSeries.shopify_revenue[i] || 0,
                    spend: allSeries.spend[i] || 0,
                    sessions: allSeries.sessions[i] || 0,
                    total_clicks: allSeries.total_clicks[i] || 0,
                    meta_revenue: metaSeries.revenue[i] || 0,
                    meta_spend: metaSeries.spend[i] || 0,
                    meta_clicks: metaSeries.clicks[i] || 0,
                    meta_outbound_clicks: metaSeries.outbound_clicks[i] || 0,
                    ad_revenue: adwordSeries.revenue[i] || 0,
                    ad_spend: adwordSeries.spend[i] || 0,
                    ad_clicks: adwordSeries.clicks[i] || 0,
                };

                let bucketMoment: moment.Moment;
                if (agg === "weekly") {
                    bucketMoment = m.clone().startOf("isoWeek"); // Monday
                } else {
                    // 'monthly'
                    bucketMoment = m.clone().startOf("month");
                }

                const bucketKey = bucketMoment.format("YYYY-MM-DD");

                if (!bucketMap[bucketKey]) {
                    bucketMap[bucketKey] = {
                        channel_revenue: 0,
                        shopify_revenue: 0,
                        spend: 0,
                        sessions: 0,
                        total_clicks: 0,
                        meta_revenue: 0,
                        meta_spend: 0,
                        meta_clicks: 0,
                        meta_outbound_clicks: 0, // 🔴 NEW
                        ad_revenue: 0,
                        ad_spend: 0,
                        ad_clicks: 0,
                    };
                }

                const b = bucketMap[bucketKey];
                b.channel_revenue += dayPoint.channel_revenue;
                b.shopify_revenue += dayPoint.shopify_revenue;
                b.spend += dayPoint.spend;
                b.sessions += dayPoint.sessions;
                b.total_clicks += dayPoint.total_clicks;
                b.meta_revenue += dayPoint.meta_revenue;
                b.meta_spend += dayPoint.meta_spend;
                b.meta_clicks += dayPoint.meta_clicks;
                b.meta_outbound_clicks += dayPoint.meta_outbound_clicks; // 🔴 NEW
                b.ad_revenue += dayPoint.ad_revenue;
                b.ad_spend += dayPoint.ad_spend;
                b.ad_clicks += dayPoint.ad_clicks;
            });

            const aggLabels = Object.keys(bucketMap).sort();
            const aggAllSeries = {
                channel_revenue: [] as number[],
                shopify_revenue: [] as number[],
                spend: [] as number[],
                sessions: [] as number[],
                total_clicks: [] as number[],
                roas: [] as number[],
                cpc: [] as number[],
            };
            const aggMetaSeries = {
                revenue: [] as number[],
                spend: [] as number[],
                clicks: [] as number[],
                roas: [] as number[],
                cpc: [] as number[],
                outbound_clicks: [] as number[], // 🔴 NEW
            };
            const aggAdwordSeries = {
                revenue: [] as number[],
                spend: [] as number[],
                clicks: [] as number[],
                roas: [] as number[],
                cpc: [] as number[],
                outbound_clicks: [] as number[], // 🔴 NEW
            };

            aggLabels.forEach((key) => {
                const v = bucketMap[key];
                aggAllSeries.channel_revenue.push(Number(v.channel_revenue.toFixed(2)));
                aggAllSeries.shopify_revenue.push(Number(v.shopify_revenue.toFixed(2)));
                aggAllSeries.spend.push(Number(v.spend.toFixed(2)));
                aggAllSeries.sessions.push(v.sessions);
                aggAllSeries.total_clicks.push(v.total_clicks);

                // Calculated metrics
                aggAllSeries.roas.push(
                    v.spend > 0 ? Number((v.channel_revenue / v.spend).toFixed(2)) : 0,
                );
                aggAllSeries.cpc.push(
                    v.total_clicks > 0
                        ? Number((v.spend / v.total_clicks).toFixed(2))
                        : 0,
                );

                aggMetaSeries.revenue.push(Number(v.meta_revenue.toFixed(2)));
                aggMetaSeries.spend.push(Number(v.meta_spend.toFixed(2)));
                aggMetaSeries.clicks.push(v.meta_clicks);
                aggMetaSeries.outbound_clicks.push(v.meta_outbound_clicks); // 🔴 NEW
                aggMetaSeries.roas.push(
                    v.meta_spend > 0
                        ? Number((v.meta_revenue / v.meta_spend).toFixed(2))
                        : 0,
                );
                aggMetaSeries.cpc.push(
                    v.meta_clicks > 0
                        ? Number((v.meta_spend / v.meta_clicks).toFixed(2))
                        : 0,
                );

                aggAdwordSeries.revenue.push(Number(v.ad_revenue.toFixed(2))); // Keep offset consistent
                aggAdwordSeries.spend.push(Number(v.ad_spend.toFixed(2)));
                aggAdwordSeries.clicks.push(v.ad_clicks);
                aggAdwordSeries.outbound_clicks.push(0); // 🔴 NEW (Placeholder)
                aggAdwordSeries.roas.push(
                    v.ad_spend > 0 ? Number((v.ad_revenue / v.ad_spend).toFixed(2)) : 0,
                );
                aggAdwordSeries.cpc.push(
                    v.ad_clicks > 0 ? Number((v.ad_spend / v.ad_clicks).toFixed(2)) : 0,
                );
            });

            return {
                labels: aggLabels,
                allSeries: aggAllSeries,
                metaSeries: aggMetaSeries,
                adwordSeries: aggAdwordSeries,
            };
        };

        // ---------- RANGE-WISE COMPUTE HELPER ----------
        const computeRangeStats = (
            rangeStart: moment.Moment,
            rangeEnd: moment.Moment,
            agg: AggType,
        ) => {
            const inRange = (dateStr: string) =>
                moment(dateStr, "YYYY-MM-DD", true).isValid() &&
                !moment(dateStr).isBefore(rangeStart, "day") &&
                !moment(dateStr).isAfter(rangeEnd, "day");

            // per-day maps
            const metaGlobal: Record<string, DailyMetric> = {};
            const metaSel: Record<string, DailyMetric> = {};
            const adGlobal: Record<string, DailyMetric> = {};
            const adSel: Record<string, DailyMetric> = {};
            const shopGlobal: Record<string, DailyRev> = {};
            const shopSel: Record<string, DailyRev> = {};

            const aggregateChannel = (
                resp: any,
                targetGlobal: Record<string, DailyMetric>,
                targetSel: Record<string, DailyMetric>,
            ) => {
                if (!resp || typeof resp !== "object") return;

                Object.entries(resp).forEach(([dateKey, groupObj]: [string, any]) => {
                    if (!inRange(dateKey)) return;

                    if (!targetGlobal[dateKey])
                        targetGlobal[dateKey] = { revenue: 0, spend: 0, clicks: 0 };
                    if (!targetSel[dateKey])
                        targetSel[dateKey] = { revenue: 0, spend: 0, clicks: 0 };

                    Object.entries(groupObj || {}).forEach(
                        ([groupName, entities]: [string, any]) => {
                            const groupNameNorm = String(groupName).toLowerCase();
                            const groupMatches =
                                !hasGroupFilter || groupNameNorm === groupNorm;

                            Object.entries(entities || {}).forEach(
                                ([entityName, entity]: [string, any]) => {
                                    const entityNameNorm = String(entityName).toLowerCase();

                                    const rev = Number(entity.revenue || 0);
                                    const spd = Number(entity.spend || 0);
                                    const clk = Number(entity.clicks || 0);
                                    const outClk = Number(entity.outbound_clicks || 0); // 🔴 NEW

                                    // 🔴 NEW: attribution revenues
                                    const rev7dClick = Number(entity.revenue_7d_click || 0);
                                    const rev1dView = Number(entity.revenue_1d_view || 0);

                                    // GLOBAL
                                    targetGlobal[dateKey].revenue += rev;
                                    targetGlobal[dateKey].spend += spd;
                                    targetGlobal[dateKey].clicks += clk;
                                    targetGlobal[dateKey].outbound_clicks =
                                        (targetGlobal[dateKey].outbound_clicks || 0) + outClk; // 🔴 NEW
                                    targetGlobal[dateKey].revenue_7d_click =
                                        (targetGlobal[dateKey].revenue_7d_click || 0) + rev7dClick;
                                    targetGlobal[dateKey].revenue_1d_view =
                                        (targetGlobal[dateKey].revenue_1d_view || 0) + rev1dView;

                                    // SELECTION
                                    if (!hasAnyFilter) {
                                        targetSel[dateKey].revenue += rev;
                                        targetSel[dateKey].spend += spd;
                                        targetSel[dateKey].clicks += clk;
                                        targetSel[dateKey].revenue_7d_click =
                                            (targetSel[dateKey].revenue_7d_click || 0) + rev7dClick;
                                        targetSel[dateKey].revenue_1d_view =
                                            (targetSel[dateKey].revenue_1d_view || 0) + rev1dView;
                                        return;
                                    }

                                    if (!groupMatches) return;

                                    let isExcluded = false;
                                    if (hasEntityFilter) {
                                        const entId =
                                            entityNameMap[groupNameNorm]?.[entityNameNorm];
                                        if (entId && excludedIds.has(entId)) {
                                            isExcluded = true;
                                        }
                                    }
                                    if (isExcluded) return;

                                    targetSel[dateKey].revenue += rev;
                                    targetSel[dateKey].spend += spd;
                                    targetSel[dateKey].clicks += clk;
                                    targetSel[dateKey].outbound_clicks =
                                        (targetSel[dateKey].outbound_clicks || 0) + outClk; // 🔴 NEW
                                    targetSel[dateKey].revenue_7d_click =
                                        (targetSel[dateKey].revenue_7d_click || 0) + rev7dClick;
                                    targetSel[dateKey].revenue_1d_view =
                                        (targetSel[dateKey].revenue_1d_view || 0) + rev1dView;
                                },
                            );
                        },
                    );
                });
            };

            const aggregateShopify = (
                resp: any,
                targetGlobal: Record<string, DailyRev>,
                targetSel: Record<string, DailyRev>,
            ) => {
                if (!resp || typeof resp !== "object") return;

                Object.entries(resp).forEach(([dateKey, groupObj]: [string, any]) => {
                    if (!inRange(dateKey)) return;

                    if (!targetGlobal[dateKey]) targetGlobal[dateKey] = { revenue: 0 };
                    if (!targetSel[dateKey]) targetSel[dateKey] = { revenue: 0 };

                    Object.entries(groupObj || {}).forEach(
                        ([groupName, entities]: [string, any]) => {
                            const groupNameNorm = String(groupName).toLowerCase();
                            const groupMatches =
                                !hasGroupFilter || groupNameNorm === groupNorm;

                            Object.entries(entities || {}).forEach(
                                ([entityName, entity]: [string, any]) => {
                                    const entityNameNorm = String(entityName).toLowerCase();
                                    const rev = Number(entity.revenue || 0);

                                    // GLOBAL
                                    targetGlobal[dateKey].revenue += rev;

                                    // SELECTION
                                    if (!hasAnyFilter) {
                                        targetSel[dateKey].revenue += rev;
                                        return;
                                    }

                                    if (!groupMatches) return;

                                    let isExcluded = false;
                                    if (hasEntityFilter) {
                                        const entId =
                                            entityNameMap[groupNameNorm]?.[entityNameNorm];
                                        if (entId && excludedIds.has(entId)) {
                                            isExcluded = true;
                                        }
                                    }
                                    if (isExcluded) return;

                                    targetSel[dateKey].revenue += rev;
                                },
                            );
                        },
                    );
                });
            };

            // snapshots par aggregation
            snapshots.forEach((snap) => {
                const metaResp = snap.data?.meta_response || {};
                const adwordResp = snap.data?.adword_response || {};
                const shopifyResp = snap.data?.shopify_response || {};

                aggregateChannel(metaResp, metaGlobal, metaSel);
                aggregateChannel(adwordResp, adGlobal, adSel);
                aggregateShopify(shopifyResp, shopGlobal, shopSel);
            });

            // labels (sirf is range ke)
            const labels: string[] = [];
            const cur = rangeStart.clone();
            while (cur.isSameOrBefore(rangeEnd, "day")) {
                labels.push(cur.format("YYYY-MM-DD"));
                cur.add(1, "day");
            }

            // SERIES (selection ke hisaab se)
            const allSeries = {
                channel_revenue: [] as number[],
                shopify_revenue: [] as number[],
                spend: [] as number[],
                sessions: [] as number[],
                total_clicks: [] as number[],
            };
            const metaSeries = {
                revenue: [] as number[],
                spend: [] as number[],
                clicks: [] as number[],
                outbound_clicks: [] as number[], // 🔴 NEW
            };
            const adwordSeries = {
                revenue: [] as number[],
                spend: [] as number[],
                clicks: [] as number[],
                outbound_clicks: [] as number[], // Just in case
            };

            // TOTALS (GLOBAL + SELECTION)
            let totalMetaRevSel = 0,
                totalMetaSpdSel = 0,
                totalMetaClkSel = 0,
                totalMetaOutClkSel = 0; // 🔴 NEW
            let totalAdRevSel = 0,
                totalAdSpdSel = 0,
                totalAdClkSel = 0;
            let totalShopRevSel = 0;
            let totalMetaRevSel7Click = 0;
            let totalMetaRevSel1View = 0;

            let totalMetaRevGlobal = 0,
                totalMetaSpdGlobal = 0,
                totalMetaClkGlobal = 0;
            let totalAdRevGlobal = 0,
                totalAdSpdGlobal = 0,
                totalAdClkGlobal = 0;
            let totalShopRevGlobal = 0;

            labels.forEach((date) => {
                const mg = metaGlobal[date] || { revenue: 0, spend: 0, clicks: 0 };
                const ag = adGlobal[date] || { revenue: 0, spend: 0, clicks: 0 };
                const sg = shopGlobal[date] || { revenue: 0 };

                const ms = metaSel[date] || { revenue: 0, spend: 0, clicks: 0 };
                const as = adSel[date] || { revenue: 0, spend: 0, clicks: 0 };
                const ss = shopSel[date] || { revenue: 0 };

                // GLOBAL totals
                totalMetaRevGlobal += mg.revenue;
                totalMetaSpdGlobal += mg.spend;
                totalMetaClkGlobal += mg.clicks;

                totalAdRevGlobal += ag.revenue;
                totalAdSpdGlobal += ag.spend;
                totalAdClkGlobal += ag.clicks;

                totalShopRevGlobal += sg.revenue;

                // SELECTION totals
                totalMetaRevSel += ms.revenue;
                totalMetaSpdSel += ms.spend;
                totalMetaClkSel += ms.clicks;
                totalMetaOutClkSel += ms.outbound_clicks || 0; // 🔴 NEW

                totalAdRevSel += as.revenue;
                totalAdSpdSel += as.spend;
                totalAdClkSel += as.clicks;

                totalShopRevSel += ss.revenue;

                // 🔴 NEW: attribution revenue totals (selection)
                totalMetaRevSel7Click += ms.revenue_7d_click || 0;
                totalMetaRevSel1View += ms.revenue_1d_view || 0;

                // SERIES (selection)
                const chRevDay = ms.revenue + as.revenue;
                const spendDay = ms.spend + as.spend;

                const clicksDay = (ms.clicks || 0) + (as.clicks || 0);

                allSeries.channel_revenue.push(Number(chRevDay.toFixed(2)));
                allSeries.shopify_revenue.push(Number(ss.revenue.toFixed(2)));
                allSeries.spend.push(Number(spendDay.toFixed(2)));
                allSeries.sessions.push(Number(ss.sessions || 0)); // Ensure it's a number
                allSeries.total_clicks.push(clicksDay);

                metaSeries.revenue.push(Number(ms.revenue.toFixed(2)));
                metaSeries.spend.push(Number(ms.spend.toFixed(2)));
                metaSeries.clicks.push(ms.clicks);
                metaSeries.outbound_clicks.push(ms.outbound_clicks || 0); // 🔴 NEW

                adwordSeries.revenue.push(Number(as.revenue.toFixed(2)));
                adwordSeries.spend.push(Number(as.spend.toFixed(2)));
                adwordSeries.clicks.push(as.clicks);
                adwordSeries.outbound_clicks.push(0); // Adword usually doesn't have outbound defined same way, or just 0
            });

            // SELECTION CHANNEL TOTALS
            const channelRevenueSel = totalMetaRevSel + totalAdRevSel;
            const spendSel = totalMetaSpdSel + totalAdSpdSel;
            const clicksSel = totalMetaClkSel + totalAdClkSel;

            const roas_channel =
                spendSel > 0 ? Number((channelRevenueSel / spendSel).toFixed(2)) : 0;
            const roas_shopify =
                spendSel > 0 ? Number((totalShopRevSel / spendSel).toFixed(2)) : 0;
            const cpc_channel =
                clicksSel > 0 ? Number((spendSel / clicksSel).toFixed(2)) : 0;

            // GLOBAL CHANNEL TOTALS (for % of spend / sale)
            const channelSpendGlobal = totalMetaSpdGlobal + totalAdSpdGlobal;
            const shopRevenueGlobal = totalShopRevGlobal;

            let percent_of_spend: number | null = null;
            let percent_of_sale: number | null = null;

            if (hasAnyFilter) {
                percent_of_spend =
                    channelSpendGlobal > 0
                        ? Number(((spendSel / channelSpendGlobal) * 100).toFixed(2))
                        : 0;

                percent_of_sale =
                    shopRevenueGlobal > 0
                        ? Number(((totalShopRevSel / shopRevenueGlobal) * 100).toFixed(2))
                        : 0;
            }

            // Apply chart aggregation (daily -> weekly/monthly)
            const aggregated = aggregateTimeseries(
                labels,
                allSeries,
                metaSeries,
                adwordSeries,
                agg,
            );

            return {
                labels: aggregated.labels,
                allSeries: aggregated.allSeries,
                metaSeries: aggregated.metaSeries,
                adwordSeries: aggregated.adwordSeries,
                totals: {
                    channel_revenue: Number(channelRevenueSel.toFixed(2)),
                    shopify_revenue: Number(totalShopRevSel.toFixed(2)),
                    spend: Number(spendSel.toFixed(2)),
                    clicks: Number(clicksSel.toFixed(2)),
                    cpc_channel,
                    roas_channel,
                    roas_shopify,
                    meta: {
                        revenue: Number(totalMetaRevSel.toFixed(2)),
                        spend: Number(totalMetaSpdSel.toFixed(2)),
                        clicks: Number(totalMetaClkSel.toFixed(2)),
                        outbound_clicks: Number(totalMetaOutClkSel.toFixed(2)), // 🔴 NEW
                        revenue_7d_click: Number(totalMetaRevSel7Click.toFixed(2)),
                        revenue_1d_view: Number(totalMetaRevSel1View.toFixed(2)),
                        roas_ct:
                            spendSel > 0
                                ? Number((totalMetaRevSel7Click / totalMetaSpdSel).toFixed(2))
                                : 0,
                        roas_vt:
                            spendSel > 0
                                ? Number((totalMetaRevSel1View / totalMetaSpdSel).toFixed(2))
                                : 0,
                        // ✅ NEW: Meta percent of spend
                        percent_of_spend:
                            hasAnyFilter && totalMetaSpdGlobal > 0
                                ? Number(
                                    ((totalMetaSpdSel / totalMetaSpdGlobal) * 100).toFixed(2),
                                )
                                : null,

                        // ✅ NEW: Percent of Sale (Meta Revenue vs Total Shopify Revenue)
                        percent_of_sale:
                            hasAnyFilter && shopRevenueGlobal > 0
                                ? Number(
                                    ((totalMetaRevSel / shopRevenueGlobal) * 100).toFixed(2),
                                )
                                : null,
                    },

                    adword: {
                        revenue: Number(totalAdRevSel.toFixed(2)),
                        spend: Number(totalAdSpdSel.toFixed(2)),
                        clicks: Number(totalAdClkSel.toFixed(2)),
                        percent_of_spend:
                            hasAnyFilter && totalAdSpdGlobal > 0
                                ? Number(((totalAdSpdSel / totalAdSpdGlobal) * 100).toFixed(2))
                                : null,

                        // ✅ NEW: Percent of Sale (Adword Revenue vs Total Shopify Revenue)
                        percent_of_sale:
                            hasAnyFilter && shopRevenueGlobal > 0
                                ? Number(((totalAdRevSel / shopRevenueGlobal) * 100).toFixed(2))
                                : null,
                    },
                    global: {
                        channel_spend: Number(channelSpendGlobal.toFixed(2)),
                        shopify_revenue: Number(shopRevenueGlobal.toFixed(2)),
                    },
                    percent_of_spend,
                    percent_of_sale,
                    percent_of_spend_combined:
                        hasAnyFilter && channelSpendGlobal > 0
                            ? Number(((spendSel / channelSpendGlobal) * 100).toFixed(2))
                            : null,

                    percent_of_sale_combined:
                        hasAnyFilter && shopRevenueGlobal > 0
                            ? Number(((totalShopRevSel / shopRevenueGlobal) * 100).toFixed(2))
                            : null,
                },
            };
        };

        // ---------- COMPUTE MAIN (BASE) + OPTIONAL COMPARE (CURRENT) ----------
        const mainRange = computeRangeStats(mainStart, mainEnd, aggType);
        const mainTotals = mainRange.totals;

        let compareRange: ReturnType<typeof computeRangeStats> | null = null;
        let compareTotals: typeof mainTotals | null = null;

        if (hasCompareRange && compStart && compEnd) {
            compareRange = computeRangeStats(compStart, compEnd, aggType);
            compareTotals = compareRange.totals;
        }

        const getStatsObject = (totals: any) => {
            const revenue = Number(totals.revenue || 0);
            const spend = Number(totals.spend || 0);
            const clicks = Number(totals.clicks || 0);
            const outbound_clicks = Number(totals.outbound_clicks || 0); // 🔴 NEW
            const revenue7Click = Number(totals.revenue_7d_click || 0);
            const revenue1View = Number(totals.revenue_1d_view || 0);
            const percentOfSpend = totals.percent_of_spend;
            const percentOfSale = totals.percent_of_sale;

            const safeDiv = (num: number, den: number) =>
                den > 0 ? Number((num / den).toFixed(2)) : 0;

            return {
                revenue,
                spend,
                clicks,
                outbound_clicks, // 🔴 NEW
                cpc: safeDiv(spend, clicks),
                roas: safeDiv(revenue, spend),

                revenue_7d_click: Number(revenue7Click.toFixed(2)),
                revenue_1d_view: Number(revenue1View.toFixed(2)),

                // ROAS CT = revenue_7d_click / spend
                roas_ct: safeDiv(revenue7Click, spend),

                // ROAS VT = revenue_1d_view / spend
                roas_vt: safeDiv(revenue1View, spend),
                percent_of_spend: percentOfSpend, // ✅ Already there
                percent_of_sale: percentOfSale, // ✅ NEW: Pass through
            };
        };

        const allStats: any = {
            current: {
                channel_revenue: mainTotals.channel_revenue,
                shopify_revenue: mainTotals.shopify_revenue,
                spend: mainTotals.spend,
                clicks: mainTotals.clicks,
                cpc: mainTotals.cpc_channel,
                roas_channel: mainTotals.roas_channel,
                roas_shopify: mainTotals.roas_shopify,
                percent_of_spend: mainTotals.percent_of_spend,
                percent_of_sale: mainTotals.percent_of_sale,
            },
        };

        const metaStats: any = {
            current: getStatsObject(mainTotals.meta),
        };

        if (hasCompareRange && compareTotals) {
            metaStats.base = getStatsObject(mainTotals.meta);
            metaStats.comparison = getStatsObject(compareTotals.meta);
        }

        const adwordStats: any = {
            current: getStatsObject(mainTotals.adword),
        };

        // Agar comparison range diya hua hai tabhi "base" + "comparison" add karo
        if (hasCompareRange && compareTotals) {
            allStats.base = {
                channel_revenue: mainTotals.channel_revenue,
                shopify_revenue: mainTotals.shopify_revenue,
                spend: mainTotals.spend,
                clicks: mainTotals.clicks,
                cpc: mainTotals.cpc_channel,
                roas_channel: mainTotals.roas_channel,
                roas_shopify: mainTotals.roas_shopify,
                percent_of_spend: mainTotals.percent_of_spend,
                percent_of_sale: mainTotals.percent_of_sale,
            };

            allStats.comparison = {
                channel_revenue: compareTotals.channel_revenue,
                shopify_revenue: compareTotals.shopify_revenue,
                spend: compareTotals.spend,
                clicks: compareTotals.clicks,
                cpc: compareTotals.cpc_channel,
                roas_channel: compareTotals.roas_channel,
                roas_shopify: compareTotals.roas_shopify,
                percent_of_spend: compareTotals.percent_of_spend,
                percent_of_sale: compareTotals.percent_of_sale,
            };

            metaStats.base = getStatsObject(mainTotals.meta);
            metaStats.comparison = getStatsObject(compareTotals.meta);

            adwordStats.base = getStatsObject(mainTotals.adword);
            adwordStats.comparison = getStatsObject(compareTotals.adword);
        }

        // OVERALL cards ke liye: main (current) range ko primary mana
        const overall_stats = {
            channel_revenue: allStats.current.channel_revenue,
            shopify_revenue: allStats.current.shopify_revenue,
            spend: allStats.current.spend,
            clicks: allStats.current.clicks,
            cpc_channel: allStats.current.cpc,
            roas_channel: allStats.current.roas_channel,
            roas_shopify: allStats.current.roas_shopify,
            percent_of_spend: allStats.current.percent_of_spend,
            percent_of_sale: allStats.current.percent_of_sale,
        };


        const isSpecialClientForAdword = client?.name === "Urban Savage";

        const charts: any = {
            all: {
                labels: mainRange.labels,
                series: mainRange.allSeries,
                stats: allStats,
            },
            meta: {
                labels: mainRange.labels,
                series: mainRange.metaSeries,
                stats: metaStats,
            },
        };

        // ✅ Only add comparison chart data if dates provided
        if (hasCompareRange && compareRange) {
            charts.all.comparison_labels = compareRange.labels;
            charts.all.comparison_series = compareRange.allSeries;

            charts.meta.comparison_labels = compareRange.labels;
            charts.meta.comparison_series = compareRange.metaSeries;
        }

        // Sirf normal clients ke liye Adword tab add karo
        if (!isSpecialClientForAdword) {
            charts.adword = {
                labels: mainRange.labels,
                series: mainRange.adwordSeries,
                stats: adwordStats,
            };

            if (hasCompareRange && compareRange) {
                charts.adword.comparison_labels = compareRange.labels;
                charts.adword.comparison_series = compareRange.adwordSeries;
            }
        }
        return res.status(200).json({
            success: true,
            status_code: 200,
            message: "Sport performance report v2 fetched successfully",
            data: {
                client_id,
                client_name: client.name,
                date_range: {
                    start_date,
                    end_date,
                    compare_start_date: hasCompareRange ? compare_start_date : null,
                    compare_end_date: hasCompareRange ? compare_end_date : null,
                },
                filters: {
                    group: groupRaw || "All",
                    entity_ids: Array.from(excludedIds),
                },
                charts, // 👈 charts ke andar ab comparison bhi aa raha
                overall_stats,
            },
        });
    } catch (error: any) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(
            `[SportPerformanceV2] Error after ${duration}s:`,
            error?.message || error,
        );
        return res.status(500).json({
            success: false,
            status_code: 500,
            message: "Failed to fetch sport performance report v2",
            error:
                process.env.NODE_ENV === "development"
                    ? error?.message || error
                    : undefined,
        });
    }
};

export const getTeamPerformanceReport = async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        const clientId =
            (req.params as any).clientId || (req.params as any).client_id;

        if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "Invalid client_id",
            });
        }

        // Optional query params
        const end_date_q = (req.query.end_date as string) || null;
        const league_q = (req.query.league as string) || "All";

        // ---------- CLIENT ----------
        const client = await fetchClientById(clientId);
        if (!client) {
            return res.status(404).json({
                success: false,
                status_code: 404,
                message: "Client not found",
            });
        }

        // ---------- END DATE & RANGES ----------
        const todayUtc = moment.utc().startOf("day");
        const defaultEnd = todayUtc.clone().subtract(1, "day"); // yesterday by default

        const endMoment = end_date_q
            ? moment(end_date_q, "YYYY-MM-DD", true)
            : defaultEnd;

        if (!endMoment.isValid()) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "Invalid end_date format, expected YYYY-MM-DD",
            });
        }

        // keys: yesterday, 7d, 30d
        const ranges = {
            yesterday: {
                key: "yesterday" as const,
                label: "Yesterday",
                start: endMoment.clone(),
                end: endMoment.clone(),
            },
            "7d": {
                key: "7d" as const,
                label: "7D",
                start: endMoment.clone().subtract(6, "days"),
                end: endMoment.clone(),
            },
            "30d": {
                key: "30d" as const,
                label: "30D",
                start: endMoment.clone().subtract(29, "days"),
                end: endMoment.clone(),
            },
        } as const;

        type RangeKey = keyof typeof ranges;
        const rangeKeys: RangeKey[] = ["yesterday", "7d", "30d"];

        const globalStart = ranges["30d"].start.clone();
        const globalEnd = ranges.yesterday.end.clone();

        // ---------- LEAGUE FILTER ----------
        const leagueRaw = (league_q || "").toString().trim();
        const leagueNorm = leagueRaw.toLowerCase();
        const hasLeagueFilter = !!leagueRaw && leagueNorm !== "all";

        // ---------- MONTH KEYS ----------
        const monthKeys: string[] = [];
        const curMonth = globalStart.clone().startOf("month");
        const endMonth = globalEnd.clone().startOf("month");
        while (curMonth.isSameOrBefore(endMonth, "month")) {
            monthKeys.push(curMonth.format("YYYY-MM"));
            curMonth.add(1, "month");
        }

        // ---------- SNAPSHOTS LOAD ----------
        const snapshots = await PerformanceClientDetail.find({
            client_id: new mongoose.Types.ObjectId(clientId),
            year_month: { $in: monthKeys },
        }).lean();

        if (!snapshots.length) {
            return res.status(422).json({
                success: false,
                status_code: 422,
                message:
                    "No performance snapshot found for this client and date ranges. Please ensure cron has run.",
            });
        }

        // ---------- TYPES & HELPERS ----------

        type PlatformAgg = { revenue: number; spend: number };
        type ShopifyAgg = { revenue: number; spend: number };

        type RangeAgg = {
            meta: PlatformAgg;
            adword: PlatformAgg;
            shopify: ShopifyAgg;
        };

        const emptyPlatform = (): PlatformAgg => ({ revenue: 0, spend: 0 });
        const emptyShopify = (): ShopifyAgg => ({ revenue: 0, spend: 0 });
        const emptyRangeAgg = (): RangeAgg => ({
            meta: emptyPlatform(),
            adword: emptyPlatform(),
            shopify: emptyShopify(),
        });

        type TeamKey = string; // `${league}||${team}`
        const teamAgg: Record<
            TeamKey,
            {
                league: string;
                team: string;
                ranges: Record<RangeKey, RangeAgg>;
            }
        > = {};

        const totals: Record<RangeKey, RangeAgg> = {
            yesterday: emptyRangeAgg(),
            "7d": emptyRangeAgg(),
            "30d": emptyRangeAgg(),
        };

        const dateToRanges = (dateStr: string): RangeKey[] => {
            const m = moment(dateStr, "YYYY-MM-DD", true);
            if (!m.isValid()) return [];
            const keys: RangeKey[] = [];
            (Object.keys(ranges) as RangeKey[]).forEach((k) => {
                const r = ranges[k];
                if (!m.isBefore(r.start, "day") && !m.isAfter(r.end, "day")) {
                    keys.push(k);
                }
            });
            return keys;
        };

        const withinGlobal = (dateStr: string) => {
            const m = moment(dateStr, "YYYY-MM-DD", true);
            return (
                m.isValid() &&
                !m.isBefore(globalStart, "day") &&
                !m.isAfter(globalEnd, "day")
            );
        };

        // ---------- SNAPSHOT AGGREGATION ----------
        snapshots.forEach((snap) => {
            const metaResp = snap.data?.meta_response || {};
            const adwordResp = snap.data?.adword_response || {};
            const shopifyResp = snap.data?.shopify_response || {};

            // META
            Object.entries(metaResp).forEach(([dateStr, groupObj]: [string, any]) => {
                if (!withinGlobal(dateStr)) return;
                const activeRanges = dateToRanges(dateStr);
                if (!activeRanges.length) return;

                Object.entries(groupObj || {}).forEach(
                    ([groupName, entities]: [string, any]) => {
                        const leagueName = String(groupName);
                        const leagueNormName = leagueName.toLowerCase();
                        if (hasLeagueFilter && leagueNormName !== leagueNorm) return;

                        Object.entries(entities || {}).forEach(
                            ([entityName, entity]: [string, any]) => {
                                const teamName = String(entityName);

                                const rev = Number(entity.revenue || 0);
                                const spd = Number(entity.spend || 0);
                                if (rev === 0 && spd === 0) return;

                                const teamKey = `${leagueName}||${teamName}`;
                                if (!teamAgg[teamKey]) {
                                    const rangesInit: any = {};
                                    rangeKeys.forEach((k) => {
                                        rangesInit[k] = emptyRangeAgg();
                                    });
                                    teamAgg[teamKey] = {
                                        league: leagueName,
                                        team: teamName,
                                        ranges: rangesInit,
                                    };
                                }

                                activeRanges.forEach((rk) => {
                                    const tMeta = teamAgg[teamKey].ranges[rk].meta;
                                    tMeta.revenue += rev;
                                    tMeta.spend += spd;

                                    const totMeta = totals[rk].meta;
                                    totMeta.revenue += rev;
                                    totMeta.spend += spd;
                                });
                            },
                        );
                    },
                );
            });

            // ADWORD
            Object.entries(adwordResp).forEach(
                ([dateStr, groupObj]: [string, any]) => {
                    if (!withinGlobal(dateStr)) return;
                    const activeRanges = dateToRanges(dateStr);
                    if (!activeRanges.length) return;

                    Object.entries(groupObj || {}).forEach(
                        ([groupName, entities]: [string, any]) => {
                            const leagueName = String(groupName);
                            const leagueNormName = leagueName.toLowerCase();
                            if (hasLeagueFilter && leagueNormName !== leagueNorm) return;

                            Object.entries(entities || {}).forEach(
                                ([entityName, entity]: [string, any]) => {
                                    const teamName = String(entityName);

                                    const rev = Number(entity.revenue || 0);
                                    const spd = Number(entity.spend || 0);
                                    if (rev === 0 && spd === 0) return;

                                    const teamKey = `${leagueName}||${teamName}`;
                                    if (!teamAgg[teamKey]) {
                                        const rangesInit: any = {};
                                        rangeKeys.forEach((k) => {
                                            rangesInit[k] = emptyRangeAgg();
                                        });
                                        teamAgg[teamKey] = {
                                            league: leagueName,
                                            team: teamName,
                                            ranges: rangesInit,
                                        };
                                    }

                                    activeRanges.forEach((rk) => {
                                        const tAdv = teamAgg[teamKey].ranges[rk].adword;
                                        tAdv.revenue += rev;
                                        tAdv.spend += spd;

                                        const totAdv = totals[rk].adword;
                                        totAdv.revenue += rev;
                                        totAdv.spend += spd;
                                    });
                                },
                            );
                        },
                    );
                },
            );

            // SHOPIFY
            Object.entries(shopifyResp).forEach(
                ([dateStr, groupObj]: [string, any]) => {
                    if (!withinGlobal(dateStr)) return;
                    const activeRanges = dateToRanges(dateStr);
                    if (!activeRanges.length) return;

                    Object.entries(groupObj || {}).forEach(
                        ([groupName, entities]: [string, any]) => {
                            const leagueName = String(groupName);
                            const leagueNormName = leagueName.toLowerCase();
                            if (hasLeagueFilter && leagueNormName !== leagueNorm) return;

                            Object.entries(entities || {}).forEach(
                                ([entityName, entity]: [string, any]) => {
                                    const teamName = String(entityName);

                                    const rev = Number(entity.revenue || 0);
                                    if (rev === 0) return;

                                    const teamKey = `${leagueName}||${teamName}`;
                                    if (!teamAgg[teamKey]) {
                                        const rangesInit: any = {};
                                        rangeKeys.forEach((k) => {
                                            rangesInit[k] = emptyRangeAgg();
                                        });
                                        teamAgg[teamKey] = {
                                            league: leagueName,
                                            team: teamName,
                                            ranges: rangesInit,
                                        };
                                    }

                                    activeRanges.forEach((rk) => {
                                        const tShop = teamAgg[teamKey].ranges[rk].shopify;
                                        tShop.revenue += rev;

                                        const totShop = totals[rk].shopify;
                                        totShop.revenue += rev;
                                    });
                                },
                            );
                        },
                    );
                },
            );
        });

        // ---------- DERIVE SHOPIFY SPEND (meta + adword) ----------
        rangeKeys.forEach((rk) => {
            Object.values(teamAgg).forEach((team) => {
                const r = team.ranges[rk];
                r.shopify.spend = r.meta.spend + r.adword.spend;
            });
            const t = totals[rk];
            t.shopify.spend = t.meta.spend + t.adword.spend;
        });

        // ---------- BUILD FINAL ROWS ----------
        const rows: any[] = [];

        const safeDivPercent = (num: number, den: number): number =>
            den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0;

        const safeRoas = (rev: number, spd: number): number =>
            spd > 0 ? Number((rev / spd).toFixed(2)) : 0;

        // Team rows
        Object.values(teamAgg)
            .sort(
                (a, b) =>
                    a.league.localeCompare(b.league) || a.team.localeCompare(b.team),
            )
            .forEach((team) => {
                const teamRow: any = {
                    league: team.league,
                    team: team.team,
                    ranges: {} as any,
                };

                rangeKeys.forEach((rk) => {
                    const rTeam = team.ranges[rk];
                    const tTot = totals[rk];

                    const metaRevShare = safeDivPercent(
                        rTeam.meta.revenue,
                        tTot.meta.revenue,
                    );
                    const metaSpdShare = safeDivPercent(
                        rTeam.meta.spend,
                        tTot.meta.spend,
                    );

                    const adRevShare = safeDivPercent(
                        rTeam.adword.revenue,
                        tTot.adword.revenue,
                    );
                    const adSpdShare = safeDivPercent(
                        rTeam.adword.spend,
                        tTot.adword.spend,
                    );

                    const shopRevShare = safeDivPercent(
                        rTeam.shopify.revenue,
                        tTot.shopify.revenue,
                    );
                    const shopSpdShare = safeDivPercent(
                        rTeam.shopify.spend,
                        tTot.shopify.spend,
                    );

                    teamRow.ranges[rk] = {
                        meta: {
                            revenue: Number(rTeam.meta.revenue.toFixed(2)),
                            revenue_share: metaRevShare,
                            spend: Number(rTeam.meta.spend.toFixed(2)),
                            spend_share: metaSpdShare,
                            roas: safeRoas(rTeam.meta.revenue, rTeam.meta.spend),
                        },
                        adword: {
                            revenue: Number(rTeam.adword.revenue.toFixed(2)),
                            revenue_share: adRevShare,
                            spend: Number(rTeam.adword.spend.toFixed(2)),
                            spend_share: adSpdShare,
                            roas: safeRoas(rTeam.adword.revenue, rTeam.adword.spend),
                        },
                        shopify: {
                            revenue: Number(rTeam.shopify.revenue.toFixed(2)),
                            revenue_share: shopRevShare,
                            spend: Number(rTeam.shopify.spend.toFixed(2)),
                            spend_share: shopSpdShare,
                            roas: safeRoas(rTeam.shopify.revenue, rTeam.shopify.spend),
                        },
                    };
                });

                rows.push(teamRow);
            });

        // ---------- LEAGUE TOTAL ROW ----------
        const leagueTotal: any = {
            league: hasLeagueFilter ? leagueRaw : "All",
            team: "League Total",
            is_total: true,
            ranges: {} as any,
        };

        rangeKeys.forEach((rk) => {
            const t = totals[rk];
            leagueTotal.ranges[rk] = {
                meta: {
                    revenue: Number(t.meta.revenue.toFixed(2)),
                    revenue_share: 100,
                    spend: Number(t.meta.spend.toFixed(2)),
                    spend_share: 100,
                    roas: safeRoas(t.meta.revenue, t.meta.spend),
                },
                adword: {
                    revenue: Number(t.adword.revenue.toFixed(2)),
                    revenue_share: 100,
                    spend: Number(t.adword.spend.toFixed(2)),
                    spend_share: 100,
                    roas: safeRoas(t.adword.revenue, t.adword.spend),
                },
                shopify: {
                    revenue: Number(t.shopify.revenue.toFixed(2)),
                    revenue_share: 100,
                    spend: Number(t.shopify.spend.toFixed(2)),
                    spend_share: 100,
                    roas: safeRoas(t.shopify.revenue, t.shopify.spend),
                },
            };
        });

        rows.push(leagueTotal);

        // const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // console.log(
        //     `[TeamPerformance] Completed in ${duration}s for client=${clientId}, end_date=${endMoment.format(
        //         'YYYY-MM-DD'
        //     )}, league=${leagueRaw || 'All'}`
        // );

        return res.status(200).json({
            success: true,
            status_code: 200,
            message: "Team performance report fetched successfully",
            data: {
                client_id: clientId,
                client_name: client.name,
                end_date: endMoment.format("YYYY-MM-DD"),
                ranges: {
                    yesterday: {
                        key: "yesterday",
                        label: "Yesterday",
                        start_date: ranges.yesterday.start.format("YYYY-MM-DD"),
                        end_date: ranges.yesterday.end.format("YYYY-MM-DD"),
                    },
                    "7d": {
                        key: "7d",
                        label: "7D",
                        start_date: ranges["7d"].start.format("YYYY-MM-DD"),
                        end_date: ranges["7d"].end.format("YYYY-MM-DD"),
                    },
                    "30d": {
                        key: "30d",
                        label: "30D",
                        start_date: ranges["30d"].start.format("YYYY-MM-DD"),
                        end_date: ranges["30d"].end.format("YYYY-MM-DD"),
                    },
                },
                league_filter: hasLeagueFilter ? leagueRaw : "All",
                rows,
            },
        });
    } catch (error: any) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(
            `[TeamPerformance] Error after ${duration}s:`,
            error?.message || error,
        );
        return res.status(500).json({
            success: false,
            status_code: 500,
            message: "Failed to fetch team performance report",
            error:
                process.env.NODE_ENV === "development"
                    ? error?.message || error
                    : undefined,
        });
    }
};
