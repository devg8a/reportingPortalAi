import { to2, calcCpc, calcCtr, calcRoas } from './metricsHelper';

// Helper to initialize empty aggregation object
export const createEmptyAggregation = () => ({
    revenue: 0,
    spend: 0,
    clicks: 0,
    outbound_clicks: 0,
    impressions: 0,
    sessions: 0,
    orders: 0,
    transactions: 0,
    conversions: 0,
    newUsers: 0,
    itemsPurchased: 0,

    // Shopify specific
    gross_sales: 0,
    discounts: 0,
    returns: 0,
    shipping_charges: 0,
    taxes: 0,
    net_sales: 0,
    total_sales: 0,
    quantity_ordered: 0,
    customers: 0,
    new_customers: 0,
    returning_customers: 0,
    online_store_visitors: 0,

    // Meta specific
    revenue_7d_click: 0,
    revenue_1d_view: 0,
    reach: 0,
    cpm: 0,

    // GA specific
    bounceRate: 0,
    conversionRate: 0,
    averageSessionDuration: 0,
    userEngagementDuration: 0,
    screenPageViewsPerSession: 0,

    // Derived metrics
    cpc: 0,
    ctr: 0,
    roas: 0,
    roas_ct: 0,
    roas_vt: 0,
    avg_order_value: 0,
    conversion_rate: 0,
});

// Helper to add metrics to aggregation
export const addToAggregation = (agg: any, metrics: any) => {
    // Common fields
    agg.revenue += metrics.revenue || 0;
    agg.spend += metrics.spend || 0;
    agg.clicks += metrics.clicks || 0;
    agg.outbound_clicks += metrics.outbound_clicks || 0;
    agg.impressions += metrics.impressions || 0;
    agg.sessions += metrics.sessions || 0;
    agg.orders += metrics.orders || 0;
    agg.transactions += metrics.transactions || 0;
    agg.conversions += metrics.conversions || 0;
    agg.newUsers += metrics.newUsers || 0;
    agg.itemsPurchased += metrics.itemsPurchased || 0;

    // Shopify
    agg.gross_sales += metrics.gross_sales || 0;
    agg.discounts += metrics.discounts || 0;
    agg.returns += metrics.returns || 0;
    agg.shipping_charges += metrics.shipping_charges || 0;
    agg.taxes += metrics.taxes || 0;
    agg.net_sales += metrics.net_sales || 0;
    agg.total_sales += metrics.total_sales || 0;
    agg.quantity_ordered += metrics.quantity_ordered || 0;
    agg.customers += metrics.customers || 0;
    agg.new_customers += metrics.new_customers || 0;
    agg.returning_customers += metrics.returning_customers || 0;
    agg.online_store_visitors += metrics.online_store_visitors || 0;

    // Meta
    agg.revenue_7d_click += metrics.revenue_7d_click || 0;
    agg.revenue_1d_view += metrics.revenue_1d_view || 0;
    agg.reach += metrics.reach || 0;

    return agg;
};

// Helper to finalize aggregation (recalculate derived metrics)
export const finalizeAggregation = (agg: any, platformId?: string) => {
    // Recalculate CPC, CTR, ROAS
    agg.cpc = calcCpc(agg.spend, agg.clicks);
    agg.ctr = calcCtr(agg.clicks, agg.impressions);
    agg.roas = calcRoas(agg.revenue, agg.spend);

    // Platform specific
    if (platformId === 'meta') {
        agg.roas_ct = calcRoas(agg.revenue_7d_click, agg.spend);
        agg.roas_vt = calcRoas(agg.revenue_1d_view, agg.spend);
        if (agg.impressions > 0) {
            agg.cpm = to2((agg.spend / agg.impressions) * 1000);
        }
    }

    if (platformId === 'shopify') {
        if (agg.orders > 0) {
            agg.avg_order_value = to2(agg.revenue / agg.orders);
        }
        if (agg.sessions > 0) {
            agg.conversion_rate = to2((agg.orders / agg.sessions) * 100);
        }
    }

    if (platformId === 'ga') {
        if (agg.sessions > 0) {
            agg.conversionRate = to2((agg.transactions / agg.sessions) * 100);
            agg.bounceRate = to2(agg.bounceRate / agg.sessions);
            agg.averageSessionDuration = to2(agg.averageSessionDuration / agg.sessions);
            agg.screenPageViewsPerSession = to2(agg.screenPageViewsPerSession / agg.sessions);
        }
    }

    // Round all numeric values to 2 decimals
    Object.keys(agg).forEach(key => {
        if (typeof agg[key] === 'number' && !key.includes('_id')) {
            agg[key] = to2(agg[key]);
        }
    });

    return agg;
};

// Calculate percentage difference
export const calculatePercentageDiff = (current: number, previous: number): number => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return to2(((current - previous) / Math.abs(previous)) * 100);
};

// Calculate difference object for comparison
export const calculateDifference = (current: any, previous: any) => {
    const revenueDiff = (current?.revenue || 0) - (previous?.revenue || 0);
    const percentageDiff = calculatePercentageDiff(
        current?.revenue || 0,
        previous?.revenue || 0
    );

    return {
        value: to2(revenueDiff),
        percentage: percentageDiff,
    };
};

// Helper to aggregate array of results by client_id
export const aggregateByClient = (
    results: any[],
    platformId?: string
): Record<string, any> => {
    const clientMap: Record<string, any> = {};

    results.forEach(item => {
        const clientId = item.client_id?.toString();
        if (!clientId) return;

        if (!clientMap[clientId]) {
            clientMap[clientId] = createEmptyAggregation();
            clientMap[clientId].client_id = item.client_id;
        }

        addToAggregation(clientMap[clientId], item);
    });

    // Finalize all aggregations
    Object.values(clientMap).forEach(agg => {
        finalizeAggregation(agg, platformId);
    });

    return clientMap;
};

// Helper to aggregate array of results into a single total
export const aggregateToTotal = (
    results: any[],
    platformId?: string
): any => {
    const total = createEmptyAggregation();

    results.forEach(item => {
        addToAggregation(total, item);
    });

    return finalizeAggregation(total, platformId);
};
