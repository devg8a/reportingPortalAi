import moment from 'moment';
import { to2 } from './metricsHelper';

// Platform-specific timeseries fields
const PLATFORM_TIMESERIES_FIELDS: Record<string, string[]> = {
    meta: [
        'spend', 'revenue', 'clicks', 'outbound_clicks', 'impressions',
        'cpc', 'ctr', 'roas', 'reach', 'cpm', 'revenue_7d_click', 'revenue_1d_view',
    ],
    adword: [
        'spend', 'revenue', 'clicks', 'impressions',
        'cpc', 'ctr', 'roas', 'quality_score',
    ],
    ga: [
        'revenue', 'sessions', 'transactions', 'itemsPurchased', 'newUsers',
        'bounceRate', 'averageSessionDuration', 'userEngagementDuration',
        'screenPageViewsPerSession', 'conversionRate',
    ],
    shopify: [
        'revenue', 'sessions', 'orders', 'gross_sales', 'discounts', 'returns',
        'net_sales', 'shipping_charges', 'taxes', 'total_sales', 'quantity_ordered',
        'customers', 'new_customers', 'returning_customers', 'online_store_visitors',
        'conversion_rate', 'avg_order_value',
    ],
    all_channels: [
        'spend', 'revenue', 'clicks', 'outbound_clicks', 'impressions',
        'sessions', 'orders', 'cpc', 'ctr', 'roas',
    ],
};

// Get zero point for a platform
const getZeroPoint = (platform?: string): Record<string, any> => {
    const id = (platform || '').toLowerCase();

    if (id === 'shopify') {
        return {
            revenue: 0, sessions: 0, orders: 0, gross_sales: 0,
            discounts: 0, returns: 0, net_sales: 0, shipping_charges: 0,
            taxes: 0, total_sales: 0, quantity_ordered: 0, customers: 0,
            new_customers: 0, returning_customers: 0, online_store_visitors: 0,
            conversion_rate: 0, avg_order_value: 0,
        };
    }

    if (id === 'meta') {
        return {
            spend: 0, revenue: 0, clicks: 0, outbound_clicks: 0,
            impressions: 0, cpc: 0, ctr: 0, roas: 0, conversions: 0,
        };
    }

    if (id === 'adword') {
        return {
            spend: 0, revenue: 0, clicks: 0, impressions: 0,
            cpc: 0, ctr: 0, roas: 0, conversions: 0,
        };
    }

    if (id === 'ga') {
        return {
            revenue: 0, sessions: 0, transactions: 0, itemsPurchased: 0,
            newUsers: 0, bounceRate: 0, averageSessionDuration: 0,
            userEngagementDuration: 0, screenPageViewsPerSession: 0,
            conversionRate: 0,
        };
    }

    return {
        outbound_clicks: 0, clicks: 0, impressions: 0,
        spend: 0, revenue: 0, sessions: 0, orders: 0,
        cpc: 0, ctr: 0, roas: 0,
    };
};

// Fill timeseries gaps with zero data
export const fillTimeseriesGaps = (
    series: Record<string, any>,
    s: moment.Moment,
    e: moment.Moment,
    platformId?: string,
): Record<string, any> => {
    const out: Record<string, any> = {};
    const cursor = moment(s).startOf('day');
    const last = moment(e).startOf('day');
    const zeroPoint = getZeroPoint(platformId);

    while (cursor.isSameOrBefore(last)) {
        const key = cursor.format('YYYY-MM-DD');
        const existingData = series[key] || {};
        out[key] = { ...zeroPoint, ...existingData };
        cursor.add(1, 'day');
    }
    return out;
};

// Clean timeseries by platform-specific fields
export const cleanTimeseriesByPlatform = (
    timeseries: Record<string, any>,
    platformId: string,
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
        allowedFields.forEach((field) => {
            if (data[field] !== undefined) {
                cleanedData[field] = data[field];
            }
        });
        cleaned[dateKey] = cleanedData;
    });

    return cleaned;
};

// Aggregate to hourly buckets
export const aggregateToHourly = (
    timeseries: Record<string, any>,
): Record<string, any> => {
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
                outbound_clicks: 0, clicks: 0, impressions: 0,
                spend: 0, revenue: 0, sessions: 0, conversions: 0,
                orders: 0, transactions: 0, itemsPurchased: 0,
                cpc: 0, ctr: 0, roas: 0,
            };
        }

        hourlyMap[hourKey].outbound_clicks += data.outbound_clicks || 0;
        hourlyMap[hourKey].clicks += data.clicks || 0;
        hourlyMap[hourKey].impressions += data.impressions || 0;
        hourlyMap[hourKey].spend += data.spend || 0;
        hourlyMap[hourKey].revenue += data.revenue || 0;
        hourlyMap[hourKey].sessions += data.sessions || 0;
        hourlyMap[hourKey].conversions += data.conversions || 0;
        hourlyMap[hourKey].orders += data.orders || 0;
        hourlyMap[hourKey].transactions += data.transactions || 0;
        hourlyMap[hourKey].itemsPurchased += data.itemsPurchased || 0;
    });

    Object.keys(hourlyMap).forEach((key) => {
        const d = hourlyMap[key];
        d.cpc = d.clicks > 0 ? to2(d.spend / d.clicks) : 0;
        d.ctr = d.impressions > 0 ? to2((d.clicks / d.impressions) * 100) : 0;
        d.roas = d.spend > 0 ? to2(d.revenue / d.spend) : 0;
        d.spend = to2(d.spend);
        d.revenue = to2(d.revenue);
    });

    return hourlyMap;
};
