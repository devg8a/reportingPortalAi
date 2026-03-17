// dataFormatters.ts

import { calcCpc, calcCtr, calcRoas, num, to2 } from './metricsHelper';

export const formatShopifyLiveData = (raw: any, formula?: string) => {
    const sessions = num(raw?.sessions) || num(raw?.online_store_visitors);
    const orders = num(raw?.orders ?? raw?.total_orders);
    const customers = num(raw?.customers);
    const newCustomers = num(raw?.new_customers);

    // ✅ Calculate components
    const G = Math.abs(num(raw?.gross_sales));
    const D = Math.abs(num(raw?.discounts));
    const S = Math.abs(num(raw?.shipping_charges));
    const T = Math.abs(num(raw?.taxes));

    // ✅ Calculate revenue based on formula
    let revenue = 0;
    const f = (formula || 'G-D+S+T').toUpperCase().replace(/\s/g, '');

    if (f === 'G-D+S+T') {
        revenue = G - D + S + T;
    } else if (f === 'G-D') {
        revenue = G - D;
    } else {
        revenue = G - D + S + T;  // Default
    }

    return {
        gross_sales: G,
        discounts: D,
        net_sales: Math.abs(num(raw?.net_sales)),
        shipping_charges: S,
        taxes: T,
        total_sales: Math.abs(num(raw?.total_sales)),

        // ✅ NEW: Add revenue field
        revenue: to2(revenue),

        sessions: sessions,
        orders: orders,
        quantity_ordered: num(raw?.quantity_ordered),
        customers: customers,
        new_customers: newCustomers,
        returning_customers: customers > 0 ? customers - newCustomers : 0,
        online_store_visitors: num(raw?.online_store_visitors),
        conversion_rate: num(raw?.conversion_rate),

        // ✅ NEW: Add avg_order_value
        avg_order_value: orders > 0 ? to2(revenue / orders) : 0,
    };
};

// ✅ Meta: Normal - NO Math.abs() (already positive)
export const formatMetaLiveData = (raw: any) => {
    const spend = num(raw?.spend);
    const outboundClicks = num(raw?.outbound_clicks);
    const clicks = num(raw?.clicks);
    const impressions = num(raw?.impressions);
    const revenue = num(raw?.revenue);

    const effectiveClicks = outboundClicks || clicks;

    let revenue7dClick = num(raw?.revenue_7d_click);
    let revenue1dView = num(raw?.revenue_1d_view);

    if (!revenue7dClick && !revenue1dView && Array.isArray(raw?.action_values)) {
        const purchase = raw.action_values.find((a: any) => a.action_type === "omni_purchase");
        if (purchase) {
            revenue7dClick = num((purchase as any)["7d_click"]);
            revenue1dView = num((purchase as any)["1d_view"]);
        }
    }

    return {
        spend: to2(spend),
        revenue: to2(revenue),
        clicks: to2(clicks),
        outbound_clicks: to2(outboundClicks),
        impressions: to2(impressions),
        cpc: calcCpc(spend, effectiveClicks),
        ctr: calcCtr(effectiveClicks, impressions),
        roas: calcRoas(revenue, spend),
        revenue_7d_click: to2(revenue7dClick),
        revenue_1d_view: to2(revenue1dView)
    };
};

// ✅ Adword: Normal - NO Math.abs()
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