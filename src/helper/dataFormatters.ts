import { calcCpc, calcCtr, calcRoas, num, to2, calculateAggregatedShopifyRevenue } from './metricsHelper';

// ⭐ NEW: Format Shopify WITHOUT calculating revenue (just pass through raw values)
export const formatShopifyLiveData = (raw: any, formula?: string) => {
    const sessions = num(raw?.sessions) || num(raw?.online_store_visitors);
    const orders = num(raw?.orders ?? raw?.total_orders);
    const customers = num(raw?.customers);
    const newCustomers = num(raw?.new_customers);

    // ⭐ Store raw values - DON'T calculate revenue here
    return {
        // Raw values for aggregation later
        gross_sales: num(raw?.gross_sales),
        discounts: num(raw?.discounts),
        returns: num(raw?.returns),
        net_sales: num(raw?.net_sales),
        shipping_charges: num(raw?.shipping_charges),
        taxes: num(raw?.taxes),
        total_sales: num(raw?.total_sales),

        // Other metrics
        sessions: sessions,
        orders: orders,
        quantity_ordered: num(raw?.quantity_ordered),
        customers: customers,
        new_customers: newCustomers,
        returning_customers: customers > 0 ? customers - newCustomers : 0,
        online_store_visitors: num(raw?.online_store_visitors),
        conversion_rate: num(raw?.conversion_rate),
    };
};

// Keep other formatters same...
export const formatMetaLiveData = (raw: any) => {
    const spend = num(raw?.spend);
    const outboundClicks = num(raw?.outbound_clicks);
    const clicks = num(raw?.clicks);
    const impressions = num(raw?.impressions);
    const revenue = num(raw?.revenue);

    const effectiveClicks = outboundClicks || clicks;

    return {
        spend: to2(spend),
        revenue: to2(revenue),
        clicks: to2(clicks),
        outbound_clicks: to2(outboundClicks),
        impressions: to2(impressions),
        cpc: calcCpc(spend, effectiveClicks),
        ctr: calcCtr(outboundClicks || clicks, impressions),
        roas: calcRoas(revenue, spend)
    };
};

export const formatAdwordLiveData = (raw: any) => {
    let spend = num(raw?.spend);
    if (raw?.cost_micros) spend = num(raw.cost_micros) / 1_000_000;
    if (!spend && raw?.cost) spend = num(raw.cost);

    const clicks = num(raw?.clicks);
    const impressions = num(raw?.impressions);
    const revenue = num(raw?.revenue ?? raw?.conversionValue ?? raw?.all_conversions);

    return {
        spend: to2(spend),
        revenue: to2(revenue),
        clicks: to2(clicks),
        impressions: to2(impressions),
        cpc: calcCpc(spend, clicks),
        ctr: calcCtr(clicks, impressions),
        roas: calcRoas(revenue, spend)
    };
};

export const formatGA4LiveData = (raw: any) => {
    const channels: any[] = Array.isArray(raw?.channels) ? raw.channels : [];

    if (!channels.length) {
        return {
            revenue: 0,
            sessions: 0,
            transactions: 0,
            itemsPurchased: 0,
            newUsers: 0,
            bounceRate: 0,
            averageSessionDuration: 0,
            userEngagementDuration: 0,
            screenPageViewsPerSession: 0,
            conversionRate: 0
        };
    }

    let revenue = 0;
    let sessions = 0;
    let transactions = 0;
    let itemsPurchased = 0;
    let newUsers = 0;
    let wBounceNumer = 0;
    let wConvNumer = 0;
    let wAvgSessDurNumer = 0;
    let wPageViewsPerSessNumer = 0;
    let userEngagementDuration = 0;

    channels.forEach((ch: any) => {
        const chRevenue = num(ch?.totalRevenue);
        const chSessions = num(ch?.sessions);
        revenue += chRevenue;
        sessions += chSessions;
        transactions += num(ch?.transactions);
        itemsPurchased += num(ch?.itemsPurchased);
        newUsers += num(ch?.newUsers);
        userEngagementDuration += num(ch?.userEngagementDuration);

        wBounceNumer += num(ch?.bounceRate) * chSessions;
        wConvNumer += num(ch?.conversionRate) * chSessions;
        wAvgSessDurNumer += num(ch?.averageSessionDuration) * chSessions;
        wPageViewsPerSessNumer += num(ch?.screenPageViewsPerSession) * chSessions;
    });

    return {
        revenue: to2(revenue),
        sessions: to2(sessions),
        transactions: to2(transactions),
        itemsPurchased: to2(itemsPurchased),
        newUsers: to2(newUsers),
        bounceRate: sessions > 0 ? to2(wBounceNumer / sessions) : 0,
        averageSessionDuration: sessions > 0 ? to2(wAvgSessDurNumer / sessions) : 0,
        userEngagementDuration: to2(userEngagementDuration),
        screenPageViewsPerSession: sessions > 0 ? to2(wPageViewsPerSessNumer / sessions) : 0,
        conversionRate: sessions > 0 ? to2(wConvNumer / sessions) : 0
    };
};

export const formatLiveDataByPlatform = (platformId: string, raw: any, formula?: string) => {
    const id = (platformId || '').toLowerCase();
    if (id === 'meta') return formatMetaLiveData(raw);
    if (id === 'adword') return formatAdwordLiveData(raw);
    if (id === 'ga') return formatGA4LiveData(raw);
    if (id === 'shopify') return formatShopifyLiveData(raw, formula);
    return raw ?? {};
};