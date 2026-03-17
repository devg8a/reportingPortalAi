export const to2 = (n: number) => Number((n ?? 0).toFixed(2));

// ✅ Original - NO Math.abs()
export const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// ✅ NEW: For absolute values when needed
export const absNum = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.abs(n) : 0;
};

export const calcCpc = (spend: number, clicks: number): number => {
    return clicks > 0 ? to2(spend / clicks) : 0;
};

export const calcCtr = (clicks: number, impressions: number): number => {
    return impressions > 0 ? to2((clicks / impressions) * 100) : 0;
};

export const calcRoas = (revenue: number, spend: number): number => {
    return spend > 0 ? to2(revenue / spend) : 0;
};

export const calculateStatsFromTimeseries = (timeseries: Record<string, any>): Record<string, number> => {
    let revenue = 0;
    let spend = 0;
    let clicks = 0;
    let outbound_clicks = 0;
    let impressions = 0;
    let sessions = 0;
    let transactions = 0;
    let newUsers = 0;
    let userEngagementDuration = 0;

    let revenue_7d_click = 0;
    let revenue_1d_view = 0;

    let wBounceNumer = 0;
    let wConvNumer = 0;
    let wAvgSessDurNumer = 0;
    let wPageViewsPerSessNumer = 0;

    Object.values(timeseries).forEach((data: any) => {
        if (!data || data.error) return;

        const dataRevenue = num(data.revenue || 0);
        const dataSpend = num(data.spend || 0);
        const dataClicks = num(data.clicks || 0);
        const dataOutboundClicks = num(data.outbound_clicks || 0);
        const dataImpressions = num(data.impressions || 0);
        const dataSessions = num(data.sessions || 0);
        const dataTransactions = num(data.transactions || 0);
        const dataNewUsers = num(data.newUsers || 0);
        const dataUED = num(data.userEngagementDuration || 0);

        const dataRev7 = num(data.revenue_7d_click || 0);
        const dataRev1 = num(data.revenue_1d_view || 0);

        revenue += dataRevenue;
        spend += dataSpend;
        clicks += dataClicks;
        outbound_clicks += dataOutboundClicks;
        impressions += dataImpressions;
        sessions += dataSessions;
        transactions += dataTransactions;
        newUsers += dataNewUsers;
        userEngagementDuration += dataUED;

        revenue_7d_click += dataRev7;
        revenue_1d_view += dataRev1;

        wBounceNumer += num(data.bounceRate || 0) * dataSessions;
        wConvNumer += num(data.conversionRate || 0) * dataSessions;
        wAvgSessDurNumer += num(data.averageSessionDuration || 0) * dataSessions;
        wPageViewsPerSessNumer += num(data.screenPageViewsPerSession || 0) * dataSessions;
    });

    const effectiveClicks = outbound_clicks || clicks;

    const safeDiv = (n: number, d: number) =>
        d > 0 ? Number((n / d).toFixed(2)) : 0;

    const totalRevenue = Number(revenue.toFixed(2));
    const totalSpend = Number(spend.toFixed(2));
    const totalRev7 = Number(revenue_7d_click.toFixed(2));
    const totalRev1 = Number(revenue_1d_view.toFixed(2));

    return {
        revenue: totalRevenue,
        spend: totalSpend,
        clicks: Number(clicks.toFixed(2)),
        outbound_clicks: Number(outbound_clicks.toFixed(2)),
        impressions: Number(impressions.toFixed(2)),
        sessions: Number(sessions.toFixed(2)),
        transactions: Number(transactions.toFixed(2)),
        newUsers: Number(newUsers.toFixed(2)),
        userEngagementDuration: Number(userEngagementDuration.toFixed(2)),

        cpc: safeDiv(spend, effectiveClicks),
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        roas: safeDiv(revenue, spend),

        revenue_7d_click: totalRev7,
        revenue_1d_view: totalRev1,
        roas_ct: safeDiv(revenue_7d_click, spend),
        roas_vt: safeDiv(revenue_1d_view, spend),

        bounceRate: sessions > 0 ? Number((wBounceNumer / sessions).toFixed(2)) : 0,
        conversionRate: sessions > 0 ? Number((wConvNumer / sessions).toFixed(2)) : 0,
        averageSessionDuration: sessions > 0 ? Number((wAvgSessDurNumer / sessions).toFixed(2)) : 0,
        screenPageViewsPerSession: sessions > 0 ? Number((wPageViewsPerSessNumer / sessions).toFixed(2)) : 0
    };
};

export const calculateAggregatedShopifyRevenue = (
    aggregated: {
        gross_sales: number;
        discounts: number;
        shipping_charges: number;
        taxes: number;
        returns: number;
        net_sales?: number;  // ✅ NEW FIELD ADDED

    },
    formula: string
): number => {


    // ✅ NEW: Check for net_sales formula FIRST
    const formulaLower = (formula || "").toLowerCase().trim();

    if (
        formulaLower === "net_sales" ||
        formulaLower === "n" ||
        formulaLower === "net sales" ||
        formulaLower === "netsales"
    ) {
        return Number(aggregated.net_sales || 0);  // Direct return, no calculation
    }

    if (!formula || typeof formula !== "string") {
        return Math.abs(aggregated.gross_sales) - Math.abs(aggregated.discounts);
    }

    // ✅ All Shopify monetary values need Math.abs()
    const map: Record<string, number> = {
        "G": Math.abs(aggregated.gross_sales),
        "D": Math.abs(aggregated.discounts),
        "S": Math.abs(aggregated.shipping_charges),
        "T": Math.abs(aggregated.taxes),
        // "R": Math.abs(aggregated.returns),
    };
    // console.log(map, "map")
    // console.log(formula, "formula")

    let result = 0;
    let currentOp = "+";

    for (const char of formula) {
        if (char === "+" || char === "-") {
            currentOp = char;
            continue;
        }

        const val = map[char] ?? 0;

        if (currentOp === "+") {
            result += val;
        } else {
            result -= val;
        }
    }
    // console.log(result, "result")

    return result;
};

// ✅ NEW: Common aggregation fields
export const COMMON_AGG_FIELDS = [
    'revenue', 'spend', 'clicks', 'impressions', 'sessions',
    'outbound_clicks', 'revenue_7d_click', 'revenue_1d_view',
    'gross_sales', 'discounts', 'returns', 'shipping_charges', 'taxes',
    'orders', 'transactions', 'newUsers', 'conversions'
];

// ✅ NEW: Aggregate two data points
export const aggregateDataPoints = (existing: any, incoming: any, fields: string[] = COMMON_AGG_FIELDS) => {
    fields.forEach(field => {
        if (incoming[field] !== undefined) {
            existing[field] = (existing[field] || 0) + (incoming[field] || 0);
        }
    });
    return existing;
};

// ✅ NEW: Recalculate derived metrics (CPC, CTR, ROAS)
export const recalculateDerivedMetrics = (data: any, platformId?: string) => {
    // Common metrics
    if (data.clicks !== undefined && data.spend !== undefined) {
        data.cpc = calcCpc(data.spend, data.clicks);
    }

    if (data.impressions !== undefined && data.clicks !== undefined) {
        data.ctr = calcCtr(data.clicks, data.impressions);
    }

    if (data.revenue !== undefined && data.spend !== undefined) {
        data.roas = calcRoas(data.revenue, data.spend);
    }

    // Platform-specific
    if (platformId === 'meta') {
        if (data.revenue_7d_click !== undefined && data.spend !== undefined) {
            data.roas_ct = calcRoas(data.revenue_7d_click, data.spend);
        }
        if (data.revenue_1d_view !== undefined && data.spend !== undefined) {
            data.roas_vt = calcRoas(data.revenue_1d_view, data.spend);
        }
    }

    if (platformId === 'shopify') {
        if (data.orders > 0 && data.revenue !== undefined) {
            data.avg_order_value = to2(data.revenue / data.orders);
        }
        if (data.sessions > 0 && data.orders !== undefined) {
            data.conversion_rate = to2((data.orders / data.sessions) * 100);
        }
    }

    // Round all numeric values
    Object.keys(data).forEach(key => {
        if (typeof data[key] === 'number' && !key.includes('_id')) {
            data[key] = to2(data[key]);
        }
    });

    return data;
};




// ============================================
// ADD AT THE END OF metricsHelper.ts
// ============================================

import {
    formatShopifyLiveData,
    formatMetaLiveData,
    formatAdwordLiveData,
    formatGA4LiveData,
    formatLiveDataByPlatform
} from './dataFormatters';
import { formattedDate } from './helper';

/**
 * ✅ CENTRALIZED METRICS CALCULATOR
 */
export class MetricsCalculator {
    private shopifyFormula: string;

    constructor(shopifyFormula: string = "G-D+S+T") {
        this.shopifyFormula = shopifyFormula || "G-D+S+T";
    }

    setFormula(formula: string): void {
        this.shopifyFormula = formula || "G-D+S+T";
    }

    /**
     * Calculate metrics from raw data using existing formatters
     */
    calculate(platform: string, rawData: any): any {
        if (!rawData) return this.getEmpty(platform);
        return formatLiveDataByPlatform(platform, rawData, this.shopifyFormula);
    }

    /**
     * Aggregate multiple data points for a platform
     */
    aggregate(dataPoints: any[], platform: string): any {
        if (!dataPoints || dataPoints.length === 0) {
            return this.getEmpty(platform);
        }

        const result = this.getEmpty(platform);
        const platformLower = platform.toLowerCase();

        dataPoints.forEach(dp => {
            if (!dp || dp.error) return;

            // Common fields
            result.revenue = (result.revenue || 0) + num(dp.revenue);
            result.spend = (result.spend || 0) + num(dp.spend);
            result.clicks = (result.clicks || 0) + num(dp.clicks);
            result.impressions = (result.impressions || 0) + num(dp.impressions);
            result.sessions = (result.sessions || 0) + num(dp.sessions);

            // Platform-specific
            if (platformLower === 'meta') {
                result.outbound_clicks = (result.outbound_clicks || 0) + num(dp.outbound_clicks);
                result.revenue_7d_click = (result.revenue_7d_click || 0) + num(dp.revenue_7d_click);
                result.revenue_1d_view = (result.revenue_1d_view || 0) + num(dp.revenue_1d_view);
            }

            if (platformLower === 'shopify') {
                result.gross_sales = (result.gross_sales || 0) + num(dp.gross_sales);
                result.discounts = (result.discounts || 0) + num(dp.discounts);
                result.shipping_charges = (result.shipping_charges || 0) + num(dp.shipping_charges);
                result.taxes = (result.taxes || 0) + num(dp.taxes);
                result.orders = (result.orders || 0) + num(dp.orders);
                result.customers = (result.customers || 0) + num(dp.customers);
                result.new_customers = (result.new_customers || 0) + num(dp.new_customers);
                result.returning_customers = (result.returning_customers || 0) + num(dp.returning_customers);
            }

            if (platformLower === 'ga') {
                result.transactions = (result.transactions || 0) + num(dp.transactions);
                result.newUsers = (result.newUsers || 0) + num(dp.newUsers);
                result.userEngagementDuration = (result.userEngagementDuration || 0) + num(dp.userEngagementDuration);
            }

            if (platformLower === 'adword') {
                result.conversions = (result.conversions || 0) + num(dp.conversions);
            }
        });

        // Recalculate derived metrics
        return this.recalculate(result, platform);
    }



    /**
 * Aggregate already-formatted timeseries data
 * Use this when data has already been processed by formatLiveDataByPlatform
 */
    aggregateTimeseries(timeseries: Record<string, any>, platform: string): any {
        const dataPoints: any[] = [];

        Object.entries(timeseries).forEach(([dateKey, data]) => {
            if (!data || data.error) return;
            dataPoints.push(data);
        });

        if (dataPoints.length === 0) {
            return this.getEmpty(platform);
        }

        return this.aggregate(dataPoints, platform);
    }

    /**
     * Recalculate derived metrics after aggregation
     */
    recalculate(data: any, platform: string): any {
        const platformLower = platform.toLowerCase();
        const result = { ...data };

        const effectiveClicks = result.outbound_clicks || result.clicks || 0;
        result.cpc = calcCpc(result.spend, effectiveClicks);
        result.ctr = calcCtr(result.clicks, result.impressions);
        result.roas = calcRoas(result.revenue, result.spend);

        if (platformLower === 'meta') {
            result.roas_ct = calcRoas(result.revenue_7d_click, result.spend);
            result.roas_vt = calcRoas(result.revenue_1d_view, result.spend);
        }

        if (platformLower === 'shopify') {
            // Recalculate revenue using formula
            result.revenue = to2(calculateAggregatedShopifyRevenue({
                gross_sales: result.gross_sales || 0,
                discounts: result.discounts || 0,
                shipping_charges: result.shipping_charges || 0,
                taxes: result.taxes || 0,
                returns: result.returns || 0,
            }, this.shopifyFormula));

            result.avg_order_value = result.orders > 0 ? to2(result.revenue / result.orders) : 0;
            result.conversion_rate = result.sessions > 0 ? to2((result.orders / result.sessions) * 100) : 0;
        }

        // Round all
        Object.keys(result).forEach(key => {
            if (typeof result[key] === 'number') {
                result[key] = to2(result[key]);
            }
        });

        return result;
    }

    /**
     * Combine all channels with priority logic
     */
    combineAllChannels(shopify: any, ga: any, meta: any, adword: any): any {
        let revenue = 0;
        if (shopify && num(shopify.revenue) > 0) {
            revenue = num(shopify.revenue);
        } else if (ga && num(ga.revenue) > 0) {
            revenue = num(ga.revenue);
        } else {
            revenue = num(meta?.revenue) + num(adword?.revenue);
        }

        let sessions = 0;
        if (shopify && num(shopify.sessions) > 0) {
            sessions = num(shopify.sessions);
        } else if (ga && num(ga.sessions) > 0) {
            sessions = num(ga.sessions);
        }

        const spend = num(meta?.spend) + num(adword?.spend);
        const clicks = num(meta?.clicks) + num(adword?.clicks);
        const outbound_clicks = num(meta?.outbound_clicks);
        const impressions = num(meta?.impressions) + num(adword?.impressions);

        const effectiveClicks = outbound_clicks || clicks;

        return {
            revenue: to2(revenue),
            spend: to2(spend),
            clicks: to2(clicks),
            outbound_clicks: to2(outbound_clicks),
            sessions: to2(sessions),
            impressions: to2(impressions),
            cpc: calcCpc(spend, effectiveClicks),
            ctr: calcCtr(clicks, impressions),
            roas: calcRoas(revenue, spend),
        };
    }

    /**
     * Process timeseries: calculate each point and return totals
     */
    processTimeseries(timeseries: Record<string, any>, platform: string): { processed: Record<string, any>; totals: any } {
        const processed: Record<string, any> = {};
        const dataPoints: any[] = [];

        Object.entries(timeseries).forEach(([dateKey, raw]) => {
            if (!raw || raw.error) return;
            const calculated = this.calculate(platform, raw);
            processed[dateKey] = calculated;
            dataPoints.push(calculated);
        });

        const totals = this.aggregate(dataPoints, platform);
        return { processed, totals };
    }

    /**
     * Get empty metrics object
     */
    getEmpty(platform: string): any {
        const platformLower = (platform || '').toLowerCase();
        const base = {
            revenue: 0,
            spend: 0,
            clicks: 0,
            impressions: 0,
            sessions: 0,
            cpc: 0,
            ctr: 0,
            roas: 0,
        };

        if (platformLower === 'meta') {
            return { ...base, outbound_clicks: 0, revenue_7d_click: 0, revenue_1d_view: 0, roas_ct: 0, roas_vt: 0 };
        }
        if (platformLower === 'shopify') {
            return { ...base, spend: undefined, gross_sales: 0, discounts: 0, shipping_charges: 0, taxes: 0, orders: 0, customers: 0, new_customers: 0, returning_customers: 0, avg_order_value: 0, conversion_rate: 0 };
        }
        if (platformLower === 'ga') {
            return { ...base, spend: undefined, transactions: 0, newUsers: 0, bounceRate: 0, averageSessionDuration: 0, userEngagementDuration: 0, conversionRate: 0 };
        }
        if (platformLower === 'adword') {
            return { ...base, conversions: 0 };
        }
        return base;
    }
}

/**
 * Build aggregated timeseries from raw docs (handles multiple accounts)
 */
export const buildAggregatedTimeseries = (
    rawDocs: any[],
    platform: string,
    shopifyFormula: string = "G-D+S+T"
): Record<string, any> => {
    const calc = new MetricsCalculator(shopifyFormula);
    const grouped: Record<string, any[]> = {};

    rawDocs.forEach(doc => {
        let dateKey: string;
        if (doc.date instanceof Date) {
            dateKey = doc.date.toISOString().split('T')[0];
        } else {
            dateKey = String(doc.date).split(' ')[0]; // Remove time part
        }

        const formatted = calc.calculate(platform, doc.data || doc);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(formatted);
    });

    const result: Record<string, any> = {};
    Object.entries(grouped).forEach(([dateKey, dataPoints]) => {
        result[dateKey] = calc.aggregate(dataPoints, platform);
    });

    return result;
};

/**
 * Extract metrics from AccountSummary raw field
 */
export const extractMetricsFromAccountSummary = (
    raw: any,
    shopifyFormula: string = "G-D+S+T"
): any => {
    const calc = new MetricsCalculator(shopifyFormula);

    const shopify = calc.calculate('shopify', raw?.shopify);
    const ga = calc.calculate('ga', raw?.ga);
    const meta = calc.calculate('meta', raw?.meta);
    const adword = calc.calculate('adword', raw?.adword);

    const combined = calc.combineAllChannels(shopify, ga, meta, adword);

    return {
        revenue: combined.revenue,
        spend: combined.spend,
        sessions: combined.sessions,
        total_clicks: combined.clicks,

        shopify_revenue: shopify.revenue,
        shopify_sessions: shopify.sessions,

        ga_revenue: ga.revenue,
        ga_sessions: ga.sessions,

        meta_spend: meta.spend,
        meta_clicks: meta.clicks,
        meta_outbound_clicks: meta.outbound_clicks,
        meta_revenue: meta.revenue,
        meta_revenue_7d_click: meta.revenue_7d_click,
        meta_revenue_1d_view: meta.revenue_1d_view,

        adword_spend: adword.spend,
        adword_clicks: adword.clicks,
        adword_revenue: adword.revenue,
    };
};



// ========== COMMON HELPERS (Top of file) ==========

/**
 * Calculate derived metrics from raw metrics
 */
export const calculateDerivedMetrics = (data: {
    clicks: number;
    impressions: number;
    spend: number;
    orders: number;
    revenue: number;
}): {
    ctr: number;
    cpc: number;
    cvr: number;
    aov: number;
    roas: number;
} => {
    return {
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        cvr: data.clicks > 0 ? (data.orders / data.clicks) * 100 : 0,
        aov: data.orders > 0 ? data.revenue / data.orders : 0,
        roas: data.spend > 0 ? data.revenue / data.spend : 0,
    };
};

/**
 * Calculate % change between two values
 */
export const calculateChange = (current: number, compared: number): number => {
    if (compared === 0) return current > 0 ? 100 : 0;
    return ((current - compared) / compared) * 100;
};

/**
 * Get date range string for a specific month from payload
 */
export const getMonthDateRange = (yearMonth: string, payload: any[]): string => {
    const monthDates = payload
        .filter(d => formattedDate(d?.date, "YYYY-MM") === yearMonth)
        .map(d => new Date(d?.date))
        .sort((a, b) => a.getTime() - b.getTime());

    if (monthDates.length === 0) return "";

    const minDate = formattedDate(monthDates[0], "YYYY-MM-DD");
    const maxDate = formattedDate(monthDates[monthDates.length - 1], "YYYY-MM-DD");

    return `${minDate} - ${maxDate}`;
};