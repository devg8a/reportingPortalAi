import moment from 'moment';
import { calcCpc, calcRoas, num, to2 } from './metricsHelper';

// ✅ Extended to support week + month
export type Aggregation = 'day' | 'hour' | 'week' | 'month';

export const CHART_METRICS = {
    revenue: { label: 'Revenue', axis: 'y', prefix: '$', suffix: '' },
    spend: { label: 'Spend', axis: 'y', prefix: '$', suffix: '' },
    cpc: { label: 'CPC', axis: 'y', prefix: '$', suffix: '' },
    sessions: { label: 'Sessions', axis: 'y1', prefix: '', suffix: '' },
    orders: { label: 'Orders', axis: 'y1', prefix: '', suffix: '' },
    roas: { label: 'ROAS', axis: 'y1', prefix: '', suffix: '' },
    conv_rate: { label: 'Conv. Rate', axis: 'y1', prefix: '', suffix: '%' }
};

// ✅ UPDATED: Add hourCutoff parameter
export const buildPlatformChartData = (
    timeseries: Record<string, any>,
    params: {
        startDate: string;
        endDate: string;
        aggregation?: Aggregation;
        platform?: string;
        hourCutoff?: number | null;  // ✅ NEW: Optional hour cutoff (0-23)
    }
) => {
    // ✅ NEW: Filter timeseries before building chart
    const filteredTimeseries = params.hourCutoff !== undefined && params.hourCutoff !== null
        ? filterTimeseriesByHour(timeseries, params.endDate, params.hourCutoff)
        : timeseries;

    const baseChart = buildChartData(filteredTimeseries, {
        startDate: params.startDate,
        endDate: params.endDate,
        aggregation: params.aggregation,
        padMissing: true,
        hourCutoff: params.hourCutoff // ✅ NEW: Pass cutoff to base builder
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
export const filterTimeseriesByHour = (
    timeseries: Record<string, any>,
    endDateStr: string,
    maxHour: number,
    keepDailyDataOnEndDate: boolean = false
): Record<string, any> => {
    const filtered: Record<string, any> = {};

    Object.entries(timeseries).forEach(([dateKey, data]) => {
        const dateMatch = dateKey.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) {
            filtered[dateKey] = data;
            return;
        }

        const keyDate = dateMatch[1];

        // Before end date - keep all
        if (keyDate < endDateStr) {
            filtered[dateKey] = data;
            return;
        }

        // After end date - skip all
        if (keyDate > endDateStr) {
            return;
        }

        // ON end date - apply hour filter
        if (keyDate === endDateStr) {
            const hourMatch = dateKey.match(/\s(\d{1,2}):/);

            if (hourMatch) {
                // Hourly data - check hour
                const dataHour = parseInt(hourMatch[1], 10);
                if (dataHour <= maxHour) {
                    filtered[dateKey] = data;
                }
            } else {
                // ✅ Daily data - keep if flag is true
                // For comparison (yesterday), we want to keep the daily total
                // But scale it proportionally
                if (keepDailyDataOnEndDate && data) {
                    // ✅ NEW: Scale daily data to match hour cutoff
                    const scaleFactor = (maxHour + 1) / 24; // e.g., 14 hours out of 24

                    const scaledData = { ...data };

                    // Scale numeric fields
                    ['revenue', 'spend', 'clicks', 'sessions', 'orders', 'impressions'].forEach(field => {
                        if (typeof scaledData[field] === 'number') {
                            scaledData[field] = Number((scaledData[field] * scaleFactor).toFixed(2));
                        }
                    });

                    // Recalculate derived metrics
                    if (scaledData.clicks > 0 && scaledData.spend !== undefined) {
                        scaledData.cpc = Number((scaledData.spend / scaledData.clicks).toFixed(2));
                    }
                    if (scaledData.spend > 0 && scaledData.revenue !== undefined) {
                        scaledData.roas = Number((scaledData.revenue / scaledData.spend).toFixed(2));
                    }

                    filtered[dateKey] = scaledData;
                }
            }
        }
    });

    return filtered;
};

export const getMetricsByApiType = (apiType: string) => {
    const normalizedType = apiType.toLowerCase();

    switch (normalizedType) {
        case 'meta':
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

        case 'ga':
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

    switch (agg) {
        case 'hour':
            return m.format('YYYY-MM-DD HH:mm');
        case 'day':
            return m.format('YYYY-MM-DD');
        case 'week':
            return m.startOf('isoWeek').format('YYYY-MM-DD');
        case 'month':
            return m.startOf('month').format('YYYY-MM-DD');
        default:
            return key;
    }
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

const buildWeekLabels = (start: string, end: string): string[] => {
    const s = moment(start, 'YYYY-MM-DD').startOf('isoWeek');
    const e = moment(end, 'YYYY-MM-DD').startOf('isoWeek');
    const labels: string[] = [];
    const cur = s.clone();
    while (cur.isSameOrBefore(e, 'week')) {
        labels.push(cur.format('YYYY-MM-DD'));
        cur.add(1, 'week');
    }
    return labels;
};

const buildMonthLabels = (start: string, end: string): string[] => {
    const s = moment(start, 'YYYY-MM-DD').startOf('month');
    const e = moment(end, 'YYYY-MM-DD').startOf('month');
    const labels: string[] = [];
    const cur = s.clone();
    while (cur.isSameOrBefore(e, 'month')) {
        labels.push(cur.format('YYYY-MM-DD'));
        cur.add(1, 'month');
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

const buildHourLabels = (
    start: string,
    end: string,
    stepMin: number,
    maxHour?: number | null
): string[] => {
    const labels: string[] = [];
    const s = moment(start, 'YYYY-MM-DD').startOf('day');

    // ✅ Apply cutoff logic
    let e: moment.Moment;
    if (maxHour !== undefined && maxHour !== null) {
        // Stop exactly at the cutoff hour
        e = moment(end, 'YYYY-MM-DD').hour(maxHour).minute(0).second(0);
    } else {
        // Full day
        e = moment(end, 'YYYY-MM-DD').endOf('day');
    }

    const cur = s.clone();
    // Use isSameOrBefore to include the exact cutoff hour
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
        conv_rate: [] as number[],
        clicks: [] as number[],
        outbound_clicks: [] as number[]
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
        series.clicks.push(to2(clicksForCpc));
        series.outbound_clicks.push(to2(b.outbound_clicks));
    });

    return series;
};

export const buildChartData = (timeseries: Record<string, TimeSeriesPoint>, params: {
    startDate: string; endDate: string; aggregation?: Aggregation; padMissing?: boolean;
    hourCutoff?: number | null;
}) => {
    const aggregation: Aggregation = params.aggregation || 'day';
    const curBuckets = aggregateTimeSeries(timeseries, aggregation);

    let labels: string[] = [];

    if (aggregation === 'day') {
        labels = buildDayLabels(params.startDate, params.endDate);
    } else if (aggregation === 'hour') {
        const keys = Object.keys(curBuckets).sort();
        if (params.padMissing !== false) {
            const stepMin = detectHourStepMinutes(keys);
            labels = buildHourLabels(params.startDate, params.endDate, stepMin, params.hourCutoff);

            // ✅ FORCE FILTER: Agar hourCutoff hai to labels ko cut karo
            if (params.hourCutoff !== undefined && params.hourCutoff !== null) {
                const endDate = params.endDate;
                labels = labels.filter(label => {
                    const labelDate = label.split(' ')[0];

                    // Keep all before end date
                    if (labelDate < endDate) return true;

                    // Skip all after end date
                    if (labelDate > endDate) return false;

                    // For end date, check hour
                    if (labelDate === endDate) {
                        const hourMatch = label.match(/\s(\d{2}):/);
                        if (hourMatch) {
                            const hour = parseInt(hourMatch[1], 10);
                            return hour <= params.hourCutoff;
                        }
                    }

                    return true;
                });

                // console.log('✂️ Filtered labels from', Object.keys(curBuckets).length, 'to', labels.length);
            }
        } else {
            labels = keys;
        }
    } else if (aggregation === 'week') {
        labels = buildWeekLabels(params.startDate, params.endDate);
    } else if (aggregation === 'month') {
        labels = buildMonthLabels(params.startDate, params.endDate);
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