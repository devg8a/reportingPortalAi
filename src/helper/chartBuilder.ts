import moment from 'moment';
import { calcCpc, calcRoas, num, to2 } from './metricsHelper';

export type Aggregation = 'day' | 'hour';

export const CHART_METRICS = {
    revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '' },
    spend: { label: 'Spend', axis: 'y', prefix: '$', suffix: '' },
    cpc: { label: 'CPC', axis: 'y', prefix: '$', suffix: '' },
    sessions: { label: 'Sessions', axis: 'y1', prefix: '', suffix: '' },
    orders: { label: 'Orders', axis: 'y1', prefix: '', suffix: '' },
    roas: { label: 'ROAS', axis: 'y1', prefix: '', suffix: '' },
    conv_rate: { label: 'Conv. Rate', axis: 'y1', prefix: '', suffix: '%' }
};



export const buildPlatformChartData = (
    timeseries: Record<string, any>,
    params: {
        startDate: string;
        endDate: string;
        aggregation?: Aggregation;
        platform?: string;
    }
) => {
    const baseChart = buildChartData(timeseries, {
        startDate: params.startDate,
        endDate: params.endDate,
        aggregation: params.aggregation,
        padMissing: true
    });

    // Add platform-specific metrics config
    const platformMetrics = params.platform
        ? getMetricsByApiType(params.platform)
        : baseChart.metrics;

    return {
        ...baseChart,
        metrics: platformMetrics
    };
};

export const getMetricsByApiType = (apiType: string) => {
    const normalizedType = apiType.toLowerCase();

    switch (normalizedType) {
        case 'meta':
        case 'facebook':
            return {
                revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '', field: 'revenue' },
                spend: { label: 'Spend', axis: 'y', prefix: '$', suffix: '', field: 'spend' },
                cpc: { label: 'CPC', axis: 'y', prefix: '$', suffix: '', field: 'cpc' },
                cpm: { label: 'CPM', axis: 'y', prefix: '$', suffix: '', field: 'cpm' },
                impressions: { label: 'Impressions', axis: 'y1', prefix: '', suffix: '', field: 'impressions' },
                clicks: { label: 'Clicks', axis: 'y1', prefix: '', suffix: '', field: 'clicks' },
                reach: { label: 'Reach', axis: 'y1', prefix: '', suffix: '', field: 'reach' },
                roas: { label: 'ROAS', axis: 'y1', prefix: '', suffix: 'x', field: 'roas' },
                ctr: { label: 'CTR', axis: 'y1', prefix: '', suffix: '%', field: 'ctr' },
                conversions: { label: 'Conversions', axis: 'y1', prefix: '', suffix: '', field: 'conversions' }
            };

        case 'ga4':
        case 'ga':
        case 'google-analytics':
            return {
                sessions: { label: 'Sessions', axis: 'y1', prefix: '', suffix: '', field: 'sessions' },
                users: { label: 'Users', axis: 'y1', prefix: '', suffix: '', field: 'users' },
                pageviews: { label: 'Page Views', axis: 'y1', prefix: '', suffix: '', field: 'pageviews' },
                bounce_rate: { label: 'Bounce Rate', axis: 'y1', prefix: '', suffix: '%', field: 'bounce_rate' },
                avg_session_duration: { label: 'Avg Session Duration', axis: 'y1', prefix: '', suffix: 's', field: 'avg_session_duration' },
                conversions: { label: 'Conversions', axis: 'y1', prefix: '', suffix: '', field: 'conversions' },
                conv_rate: { label: 'Conv. Rate', axis: 'y1', prefix: '', suffix: '%', field: 'conv_rate' },
                revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '', field: 'revenue' }
            };

        case 'shopify':
            return {
                revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '', field: 'revenue' },
                orders: { label: 'Orders', axis: 'y1', prefix: '', suffix: '', field: 'orders' },
                sessions: { label: 'Sessions', axis: 'y1', prefix: '', suffix: '', field: 'sessions' },
                conv_rate: { label: 'Conv. Rate', axis: 'y1', prefix: '', suffix: '%', field: 'conv_rate' },
                avg_order_value: { label: 'Avg Order Value', axis: 'y', prefix: '$', suffix: '', field: 'avg_order_value' },
                total_sales: { label: 'Total Sales', axis: 'y', prefix: '$', suffix: '', field: 'total_sales' },
                returning_customers: { label: 'Returning Customers', axis: 'y1', prefix: '', suffix: '', field: 'returning_customers' },
                new_customers: { label: 'New Customers', axis: 'y1', prefix: '', suffix: '', field: 'new_customers' }
            };

        case 'adword':
        case 'google-ads':
        case 'adwords':
            return {
                spend: { label: 'Spend', axis: 'y', prefix: '$', suffix: '', field: 'spend' },
                revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '', field: 'revenue' },
                clicks: { label: 'Clicks', axis: 'y1', prefix: '', suffix: '', field: 'clicks' },
                impressions: { label: 'Impressions', axis: 'y1', prefix: '', suffix: '', field: 'impressions' },
                cpc: { label: 'CPC', axis: 'y', prefix: '$', suffix: '', field: 'cpc' },
                ctr: { label: 'CTR', axis: 'y1', prefix: '', suffix: '%', field: 'ctr' },
                conversions: { label: 'Conversions', axis: 'y1', prefix: '', suffix: '', field: 'conversions' },
                conv_rate: { label: 'Conv. Rate', axis: 'y1', prefix: '', suffix: '%', field: 'conv_rate' },
                roas: { label: 'ROAS', axis: 'y1', prefix: '', suffix: 'x', field: 'roas' },
                quality_score: { label: 'Quality Score', axis: 'y1', prefix: '', suffix: '', field: 'quality_score' }
            };

        case 'criteo':
            return {
                spend: { label: 'Spend', axis: 'y', prefix: '$', suffix: '', field: 'spend' },
                revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '', field: 'revenue' },
                clicks: { label: 'Clicks', axis: 'y1', prefix: '', suffix: '', field: 'clicks' },
                impressions: { label: 'Impressions', axis: 'y1', prefix: '', suffix: '', field: 'impressions' },
                cpc: { label: 'CPC', axis: 'y', prefix: '$', suffix: '', field: 'cpc' },
                ctr: { label: 'CTR', axis: 'y1', prefix: '', suffix: '%', field: 'ctr' },
                roas: { label: 'ROAS', axis: 'y1', prefix: '', suffix: 'x', field: 'roas' },
                conversions: { label: 'Conversions', axis: 'y1', prefix: '', suffix: '', field: 'conversions' }
            };

        default:
            return {
                revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '', field: 'revenue' },
                spend: { label: 'Spend', axis: 'y', prefix: '$', suffix: '', field: 'spend' },
                clicks: { label: 'Clicks', axis: 'y1', prefix: '', suffix: '', field: 'clicks' },
                impressions: { label: 'Impressions', axis: 'y1', prefix: '', suffix: '', field: 'impressions' },
                sessions: { label: 'Sessions', axis: 'y1', prefix: '', suffix: '', field: 'sessions' },
                orders: { label: 'Orders', axis: 'y1', prefix: '', suffix: '', field: 'orders' },
                roas: { label: 'ROAS', axis: 'y1', prefix: '', suffix: 'x', field: 'roas' },
                conv_rate: { label: 'Conv. Rate', axis: 'y1', prefix: '', suffix: '%', field: 'conv_rate' }
            };
    }
};

type TimeSeriesPoint = {
    revenue?: number; spend?: number; clicks?: number; outbound_clicks?: number;
    impressions?: number; cpc?: number; ctr?: number; roas?: number;
    sessions?: number; orders?: number; transactions?: number; itemsPurchased?: number;
    conversionRate?: number;
};

type Bucket = {
    revenue: number; spend: number; sessions: number; clicks: number; outbound_clicks: number; orders: number;
};

const emptyBucket = (): Bucket => ({ revenue: 0, spend: 0, sessions: 0, clicks: 0, outbound_clicks: 0, orders: 0 });

const normalizeKey = (key: string, agg: Aggregation): string => {
    const m = moment(key, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD'], true);
    if (!m.isValid()) return key;
    return agg === 'day' ? m.format('YYYY-MM-DD') : m.format('YYYY-MM-DD HH:mm');
};

const buildDayLabels = (start: string, end: string): string[] => {
    const s = moment(start, 'YYYY-MM-DD');
    const e = moment(end, 'YYYY-MM-DD');
    const labels: string[] = [];
    const cur = s.clone();
    while (cur.isSameOrBefore(e, 'day')) {
        labels.push(cur.format('YYYY-MM-DD'));
        cur.add(1, 'day');
    }
    return labels;
};

const detectHourStepMinutes = (keys: string[]): number => {
    const minutes = new Set(
        keys
            .map(k => moment(k, 'YYYY-MM-DD HH:mm', true))
            .filter(m => m.isValid())
            .map(m => m.format('mm'))
    );
    return minutes.has('30') ? 30 : 60;
};

const buildHourLabels = (start: string, end: string, stepMin: number): string[] => {
    const labels: string[] = [];
    const s = moment(start, 'YYYY-MM-DD').startOf('day');
    const e = moment(end, 'YYYY-MM-DD').endOf('day');
    const cur = s.clone();
    while (cur.isSameOrBefore(e)) {
        labels.push(cur.format('YYYY-MM-DD HH:mm'));
        cur.add(stepMin, 'minutes');
    }
    return labels;
};

const aggregateTimeSeries = (timeseries: Record<string, TimeSeriesPoint>, agg: Aggregation): Record<string, Bucket> => {
    const buckets: Record<string, Bucket> = {};
    Object.entries(timeseries || {}).forEach(([rawKey, p]) => {
        const key = normalizeKey(rawKey, agg);
        if (!buckets[key]) buckets[key] = emptyBucket();
        const point: TimeSeriesPoint = p || {};
        const revenue = num(point.revenue);
        const spend = num(point.spend);
        const sessions = num(point.sessions);
        const clicks = num(point.clicks);
        const outbound = num(point.outbound_clicks);
        const orders = num(point.orders ?? point.transactions ?? point.itemsPurchased);

        buckets[key].revenue += revenue;
        buckets[key].spend += spend;
        buckets[key].sessions += sessions;
        buckets[key].clicks += clicks;
        buckets[key].outbound_clicks += outbound;
        buckets[key].orders += orders;
    });
    return buckets;
};

const buildSeriesArrays = (labels: string[], buckets: Record<string, Bucket>) => {
    const series = {
        revenue: [] as number[],
        spend: [] as number[],
        cpc: [] as number[],
        sessions: [] as number[],
        orders: [] as number[],
        roas: [] as number[],
        conv_rate: [] as number[]
    };

    labels.forEach(label => {
        const b = buckets[label] || emptyBucket();
        const clicksForCpc = b.outbound_clicks || b.clicks;
        const revenue = to2(b.revenue);
        const spend = to2(b.spend);
        const sessions = to2(b.sessions);
        const orders = to2(b.orders);
        const cpc = calcCpc(spend, clicksForCpc);
        const roas = calcRoas(revenue, spend);
        const convRate = sessions > 0 ? to2((orders / sessions) * 100) : 0;

        series.revenue.push(revenue);
        series.spend.push(spend);
        series.cpc.push(cpc);
        series.sessions.push(sessions);
        series.orders.push(orders);
        series.roas.push(roas);
        series.conv_rate.push(convRate);
    });

    return series;
};

export const buildChartData = (timeseries: Record<string, TimeSeriesPoint>, params: {
    startDate: string; endDate: string; aggregation?: Aggregation; padMissing?: boolean;
}) => {
    const aggregation: Aggregation = params.aggregation || 'day';
    const curBuckets = aggregateTimeSeries(timeseries, aggregation);

    let labels: string[] = [];
    if (aggregation === 'day') {
        labels = buildDayLabels(params.startDate, params.endDate);
    } else {
        const keys = Object.keys(curBuckets).sort();
        if (params.padMissing !== false) {
            const stepMin = detectHourStepMinutes(keys);
            labels = buildHourLabels(params.startDate, params.endDate, stepMin);
        } else {
            labels = keys;
        }
    }

    const curSeries = buildSeriesArrays(labels, curBuckets);

    return {
        aggregation,
        xAxisType: 'datetime',
        labels,
        metrics: CHART_METRICS,
        series: {
            labels,
            ...curSeries
        }
    };
};