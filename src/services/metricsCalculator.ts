import {
    to2,
    num,
    absNum,
    calcCpc,
    calcCtr,
    calcRoas,
    calculateAggregatedShopifyRevenue,
    calculateStatsFromTimeseries,
    aggregateDataPoints,
    recalculateDerivedMetrics,
    COMMON_AGG_FIELDS,
} from "../helper/metricsHelper";

// ============================================
// TYPES
// ============================================

export interface RawShopifyData {
    gross_sales?: number;
    discounts?: number;
    shipping_charges?: number;
    taxes?: number;
    returns?: number;
    sessions?: number;
    orders?: number;
    customers?: number;
    new_customers?: number;
    returning_customers?: number;
    online_store_visitors?: number;
    quantity_ordered?: number;
    net_sales?: number;
    total_sales?: number;
}

export interface RawMetaData {
    spend?: number;
    clicks?: number;
    outbound_clicks?: number;
    impressions?: number;
    revenue?: number;
    revenue_7d_click?: number;
    revenue_1d_view?: number;
    reach?: number;
    cpm?: number;
    purchase_roas?: number;
}

export interface RawAdwordData {
    spend?: number;
    cost?: number;
    clicks?: number;
    impressions?: number;
    revenue?: number;
    conversion_value?: number;
    conversions?: number;
}

export interface RawGAData {
    revenue?: number;
    totalRevenue?: number;
    sessions?: number;
    transactions?: number;
    newUsers?: number;
    userEngagementDuration?: number;
    bounceRate?: number;
    conversionRate?: number;
    averageSessionDuration?: number;
    screenPageViewsPerSession?: number;
    channels?: Array<{
        totalRevenue?: number;
        sessions?: number;
        transactions?: number;
    }>;
}

export interface PlatformMetrics {
    // Common
    revenue: number;
    spend: number;
    clicks: number;
    sessions: number;
    impressions: number;

    // Derived (calculated)
    cpc: number;
    ctr: number;
    roas: number;

    // Meta specific
    outbound_clicks?: number;
    revenue_7d_click?: number;
    revenue_1d_view?: number;
    roas_ct?: number;
    roas_vt?: number;
    reach?: number;
    cpm?: number;

    // Shopify specific
    gross_sales?: number;
    discounts?: number;
    shipping_charges?: number;
    taxes?: number;
    returns?: number;
    orders?: number;
    net_sales?: number;
    total_sales?: number;
    avg_order_value?: number;
    conversion_rate?: number;
    customers?: number;
    new_customers?: number;
    returning_customers?: number;

    // GA specific
    transactions?: number;
    newUsers?: number;
    userEngagementDuration?: number;
    bounceRate?: number;
    averageSessionDuration?: number;

    // Adword specific
    conversions?: number;
}

export type PlatformId = 'shopify' | 'meta' | 'adword' | 'ga' | 'criteo' | 'all_channels';

// ============================================
// METRICS CALCULATOR CLASS
// ============================================

export class MetricsCalculator {
    private shopifyFormula: string;

    constructor(shopifyFormula: string = "G-D+S+T") {
        this.shopifyFormula = shopifyFormula || "G-D+S+T";
    }

    // ========================================
    // PUBLIC: Set formula dynamically
    // ========================================
    setShopifyFormula(formula: string): void {
        this.shopifyFormula = formula || "G-D+S+T";
    }

    // ========================================
    // PUBLIC: Calculate from raw data
    // ========================================
    calculateFromRaw(platform: PlatformId | string, rawData: any): PlatformMetrics {
        if (!rawData) return this.getEmptyMetrics();

        const platformLower = platform.toLowerCase();

        switch (platformLower) {
            case 'shopify':
                return this.calculateShopify(rawData);
            case 'meta':
            case 'facebook':
                return this.calculateMeta(rawData);
            case 'adword':
            case 'adwords':
            case 'google ads':
            case 'google_ads':
                return this.calculateAdword(rawData);
            case 'ga':
            case 'ga4':
            case 'google analytics':
            case 'google_analytics':
                return this.calculateGA(rawData);
            case 'criteo':
                return this.calculateCriteo(rawData);
            default:
                console.warn(`[MetricsCalculator] Unknown platform: ${platform}`);
                return this.getEmptyMetrics();
        }
    }

    // ========================================
    // SHOPIFY: Uses calculateAggregatedShopifyRevenue ALWAYS
    // ========================================
    private calculateShopify(data: RawShopifyData): PlatformMetrics {
        const gross_sales = num(data.gross_sales);
        const discounts = absNum(data.discounts); // Always positive
        const shipping_charges = num(data.shipping_charges);
        const taxes = num(data.taxes);
        const returns = absNum(data.returns); // Always positive
        const sessions = num(data.sessions);
        const orders = num(data.orders);

        // ✅ SINGLE SOURCE OF TRUTH for Shopify revenue
        const revenue = calculateAggregatedShopifyRevenue(
            {
                gross_sales,
                discounts,
                shipping_charges,
                taxes,
                returns,
            },
            this.shopifyFormula
        );

        const metrics: PlatformMetrics = {
            revenue: to2(revenue),
            spend: 0,
            clicks: 0,
            sessions: to2(sessions),
            impressions: 0,
            cpc: 0,
            ctr: 0,
            roas: 0,

            // Shopify specific
            gross_sales: to2(gross_sales),
            discounts: to2(discounts),
            shipping_charges: to2(shipping_charges),
            taxes: to2(taxes),
            returns: to2(returns),
            orders: to2(orders),
            net_sales: to2(num(data.net_sales)),
            total_sales: to2(num(data.total_sales)),
            customers: num(data.customers),
            new_customers: num(data.new_customers),
            returning_customers: num(data.returning_customers),

            // Derived
            avg_order_value: orders > 0 ? to2(revenue / orders) : 0,
            conversion_rate: sessions > 0 ? to2((orders / sessions) * 100) : 0,
        };

        return metrics;
    }

    // ========================================
    // META: All Meta calculations
    // ========================================
    private calculateMeta(data: RawMetaData): PlatformMetrics {
        const spend = num(data.spend);
        const clicks = num(data.clicks);
        const outbound_clicks = num(data.outbound_clicks);
        const impressions = num(data.impressions);
        const reach = num(data.reach);
        const cpm = num(data.cpm);

        // Revenue attribution
        const revenue_7d_click = num(data.revenue_7d_click);
        const revenue_1d_view = num(data.revenue_1d_view);

        // ✅ PRIMARY REVENUE DECISION: Use 7d_click as main revenue
        // Change this if you want different behavior
        const revenue = revenue_7d_click > 0
            ? revenue_7d_click
            : num(data.revenue);

        // Effective clicks for CPC calculation
        const effectiveClicks = outbound_clicks > 0 ? outbound_clicks : clicks;

        const metrics: PlatformMetrics = {
            revenue: to2(revenue),
            spend: to2(spend),
            clicks: to2(clicks),
            sessions: 0,
            impressions: to2(impressions),

            // Derived
            cpc: calcCpc(spend, effectiveClicks),
            ctr: calcCtr(clicks, impressions),
            roas: calcRoas(revenue, spend),

            // Meta specific
            outbound_clicks: to2(outbound_clicks),
            revenue_7d_click: to2(revenue_7d_click),
            revenue_1d_view: to2(revenue_1d_view),
            roas_ct: calcRoas(revenue_7d_click, spend),
            roas_vt: calcRoas(revenue_1d_view, spend),
            reach: to2(reach),
            cpm: to2(cpm),
        };

        return metrics;
    }

    // ========================================
    // ADWORD: All Google Ads calculations
    // ========================================
    private calculateAdword(data: RawAdwordData): PlatformMetrics {
        const spend = num(data.spend || data.cost);
        const clicks = num(data.clicks);
        const impressions = num(data.impressions);
        const revenue = num(data.revenue || data.conversion_value);
        const conversions = num(data.conversions);

        const metrics: PlatformMetrics = {
            revenue: to2(revenue),
            spend: to2(spend),
            clicks: to2(clicks),
            sessions: 0,
            impressions: to2(impressions),

            // Derived
            cpc: calcCpc(spend, clicks),
            ctr: calcCtr(clicks, impressions),
            roas: calcRoas(revenue, spend),

            // Adword specific
            conversions: to2(conversions),
        };

        return metrics;
    }

    // ========================================
    // GA: All Google Analytics calculations
    // ========================================
    private calculateGA(data: RawGAData): PlatformMetrics {
        let revenue = 0;
        let sessions = 0;
        let transactions = 0;

        // Handle channel-based data
        if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach((ch) => {
                revenue += num(ch.totalRevenue);
                sessions += num(ch.sessions);
                transactions += num(ch.transactions);
            });
        } else {
            revenue = num(data.revenue || data.totalRevenue);
            sessions = num(data.sessions);
            transactions = num(data.transactions);
        }

        const metrics: PlatformMetrics = {
            revenue: to2(revenue),
            spend: 0,
            clicks: 0,
            sessions: to2(sessions),
            impressions: 0,

            // Derived (GA doesn't have spend/clicks)
            cpc: 0,
            ctr: 0,
            roas: 0,

            // GA specific
            transactions: to2(transactions),
            newUsers: to2(num(data.newUsers)),
            userEngagementDuration: to2(num(data.userEngagementDuration)),
            bounceRate: to2(num(data.bounceRate)),
            averageSessionDuration: to2(num(data.averageSessionDuration)),
        };

        return metrics;
    }

    // ========================================
    // CRITEO: All Criteo calculations
    // ========================================
    private calculateCriteo(data: any): PlatformMetrics {
        const spend = num(data.spend);
        const revenue = num(data.revenue);
        const clicks = num(data.clicks);
        const impressions = num(data.impressions);

        return {
            revenue: to2(revenue),
            spend: to2(spend),
            clicks: to2(clicks),
            sessions: 0,
            impressions: to2(impressions),

            cpc: calcCpc(spend, clicks),
            ctr: calcCtr(clicks, impressions),
            roas: calcRoas(revenue, spend),
        };
    }

    // ========================================
    // AGGREGATE: Combine multiple metrics
    // ========================================
    aggregate(metricsArray: PlatformMetrics[]): PlatformMetrics {
        const result = this.getEmptyMetrics();

        metricsArray.forEach((m) => {
            if (!m) return;

            // Sum all numeric fields
            Object.keys(m).forEach((key) => {
                const value = (m as any)[key];
                if (typeof value === 'number') {
                    (result as any)[key] = ((result as any)[key] || 0) + value;
                }
            });
        });

        // Recalculate derived metrics after aggregation
        result.cpc = calcCpc(result.spend, result.outbound_clicks || result.clicks);
        result.ctr = calcCtr(result.clicks, result.impressions);
        result.roas = calcRoas(result.revenue, result.spend);

        // Meta specific
        if (result.revenue_7d_click !== undefined) {
            result.roas_ct = calcRoas(result.revenue_7d_click, result.spend);
        }
        if (result.revenue_1d_view !== undefined) {
            result.roas_vt = calcRoas(result.revenue_1d_view, result.spend);
        }

        // Shopify specific
        if (result.orders && result.orders > 0) {
            result.avg_order_value = to2(result.revenue / result.orders);
        }
        if (result.sessions && result.sessions > 0 && result.orders) {
            result.conversion_rate = to2((result.orders / result.sessions) * 100);
        }

        // Round all values
        Object.keys(result).forEach((key) => {
            if (typeof (result as any)[key] === 'number') {
                (result as any)[key] = to2((result as any)[key]);
            }
        });

        return result;
    }

    // ========================================
    // AGGREGATE TIMESERIES: Process full timeseries
    // ========================================
    aggregateTimeseries(
        timeseries: Record<string, any>,
        platform: PlatformId
    ): PlatformMetrics {
        const metricsArray: PlatformMetrics[] = [];

        Object.values(timeseries).forEach((dataPoint) => {
            if (!dataPoint || dataPoint.error) return;

            const metrics = this.calculateFromRaw(platform, dataPoint);
            metricsArray.push(metrics);
        });

        return this.aggregate(metricsArray);
    }

    // ========================================
    // COMBINE ALL CHANNELS: With priority logic
    // ========================================
    combineAllChannels(
        shopify: PlatformMetrics | null,
        ga: PlatformMetrics | null,
        meta: PlatformMetrics | null,
        adword: PlatformMetrics | null,
        criteo?: PlatformMetrics | null
    ): PlatformMetrics {
        // ✅ REVENUE PRIORITY: Shopify > GA > Paid
        let revenue = 0;
        if (shopify && num(shopify.revenue) > 0) {  // ← Shopify check
            revenue = num(shopify.revenue);
        } else if (ga && num(ga.revenue) > 0) {
            revenue = num(ga.revenue);
        } else {
            revenue = num(meta?.revenue) + num(adword?.revenue);  // ← Meta use ho raha hai
        }

        // ✅ SESSIONS PRIORITY: Shopify > GA
        let sessions = 0;
        if (shopify && shopify.sessions > 0) {
            sessions = shopify.sessions;
        } else if (ga && ga.sessions > 0) {
            sessions = ga.sessions;
        }

        // ✅ SPEND & CLICKS: Always from paid platforms
        const spend = (meta?.spend || 0) + (adword?.spend || 0) + (criteo?.spend || 0);
        const clicks = (meta?.clicks || 0) + (adword?.clicks || 0) + (criteo?.clicks || 0);
        const impressions = (meta?.impressions || 0) + (adword?.impressions || 0) + (criteo?.impressions || 0);
        const outbound_clicks = (meta?.outbound_clicks || 0);

        const result: PlatformMetrics = {
            revenue: to2(revenue),
            spend: to2(spend),
            clicks: to2(clicks),
            sessions: to2(sessions),
            impressions: to2(impressions),

            // Derived
            cpc: calcCpc(spend, outbound_clicks || clicks),
            ctr: calcCtr(clicks, impressions),
            roas: calcRoas(revenue, spend),

            // Include outbound for reference
            outbound_clicks: to2(outbound_clicks),
        };

        return result;
    }

    // ========================================
    // PROCESS TIMESERIES FOR CHARTS
    // ========================================
    processTimeseriesForChart(
        timeseries: Record<string, any>,
        platform: PlatformId
    ): Record<string, PlatformMetrics> {
        const result: Record<string, PlatformMetrics> = {};

        Object.entries(timeseries).forEach(([dateKey, dataPoint]) => {
            if (!dataPoint || dataPoint.error) return;

            result[dateKey] = this.calculateFromRaw(platform, dataPoint);
        });

        return result;
    }

    // ========================================
    // CALCULATE STATS FROM TIMESERIES (wrapper)
    // ========================================
    calculateStatsFromTimeseries(timeseries: Record<string, any>): Record<string, number> {
        return calculateStatsFromTimeseries(timeseries);
    }

    // ========================================
    // EMPTY METRICS
    // ========================================
    getEmptyMetrics(): PlatformMetrics {
        return {
            revenue: 0,
            spend: 0,
            clicks: 0,
            sessions: 0,
            impressions: 0,
            cpc: 0,
            ctr: 0,
            roas: 0,
        };
    }

    // ========================================
    // HELPER: Recalculate derived metrics
    // ========================================
    recalculateDerived(metrics: PlatformMetrics, platform?: PlatformId): PlatformMetrics {
        return recalculateDerivedMetrics(metrics, platform) as PlatformMetrics;
    }
}

// ============================================
// SINGLETON INSTANCE (optional)
// ============================================
let defaultCalculator: MetricsCalculator | null = null;

export const getCalculator = (shopifyFormula?: string): MetricsCalculator => {
    if (!defaultCalculator) {
        defaultCalculator = new MetricsCalculator(shopifyFormula);
    } else if (shopifyFormula) {
        defaultCalculator.setShopifyFormula(shopifyFormula);
    }
    return defaultCalculator;
};

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export const calculateShopifyRevenue = (
    data: {
        gross_sales: number;
        discounts: number;
        shipping_charges: number;
        taxes: number;
        returns: number;
    },
    formula: string = "G-D+S+T"
): number => {
    return calculateAggregatedShopifyRevenue(data, formula);
};

export const calculateMetaRevenue = (data: RawMetaData): number => {
    const rev7d = num(data.revenue_7d_click);
    const rev1d = num(data.revenue_1d_view);
    const revGeneric = num(data.revenue);

    // Priority: 7d_click > 1d_view > generic revenue
    return to2(rev7d > 0 ? rev7d : (rev1d > 0 ? rev1d : revGeneric));
};

export const calculateAllChannelsRevenue = (
    shopifyRevenue: number,
    gaRevenue: number,
    metaRevenue: number,
    adwordRevenue: number,
    hasShopify: boolean,
    hasGA: boolean
): number => {
    if (hasShopify && shopifyRevenue > 0) {
        return to2(shopifyRevenue);
    }
    if (hasGA && gaRevenue > 0) {
        return to2(gaRevenue);
    }
    return to2(metaRevenue + adwordRevenue);
};