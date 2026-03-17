import clientConnections from "../db/models/clientConnections";
import pLimit from 'p-limit';
import { getCentralStorageModel } from "../db/schema/dynamic-central-model";
import { getMongoDbObjectId, getUtcDate, getRangeBetweenDates } from "../helper/helper";
import { calculateAggregatedShopifyRevenue, calculateDerivedMetrics, calculateChange, getMonthDateRange } from "../helper/metricsHelper";
import moment from "moment";
import redisClient from "../config/redisClient";
import { REPORT_METRICS } from "../helper/reportMetricConfig";


// ========== LABEL FORMATTER ==========
const formatMetricLabel = (network: string, key: string): string => {
    const networkNames: Record<string, string> = {
        shopify: "Shopify",
        meta: "Meta",
        ga: "GA",
        adword: "Google Ads",
        bing: "Bing",
        criteo: "Criteo",
        klaviyo: "Klaviyo"
    };

    const keyNames: Record<string, string> = {
        gross_sales: "Gross Sales",
        conv_rate: "Conv Rate",
        aov: "AOV",
        roas: "ROAS",
        cpc: "CPC",
        ctr: "CTR",
        cpoc: "CPOC",
        octr: "OCTR",
        cvr: "CVR",
        cost_per_session: "Cost Per Session",
        discount_per: "Discount %",
        google_cost: "Google Cost",
        meta_cost: "Meta Cost",
        total_cost: "Total Cost",
        open_rate: "Open Rate",
        click_rate: "Click Rate",
        email_revenue: "Email Revenue",
        sms_revenue: "SMS Revenue",
        flow_revenue: "Flow Revenue",
        no_of_items: "No. of Items",
        no_of_emails: "No. of Emails",
        no_of_sms: "No. of SMS",
        no_of_flows: "No. of Flows",
        recipients: "Recipients",
        outboundclicks: "Outbound Clicks",
        reach: "Reach"
    };

    const networkLabel = networkNames[network] || network.charAt(0).toUpperCase() + network.slice(1);
    const keyLabel = keyNames[key] || key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return `${networkLabel} ${keyLabel}`;
};

// ========== GENERATE AVAILABLE METRICS ==========
const generateAvailableMetrics = (connections: any[]): { label: string; value: string }[] => {
    const metrics: { label: string; value: string }[] = [];
    const addedKeys = new Set<string>();

    connections.forEach(conn => {
        const network = conn.network;

        // Get metrics config for this network
        const networkConfig = REPORT_METRICS[network];
        if (!networkConfig) return;

        // For regular networks
        if (networkConfig.metrics) {
            networkConfig.metrics.forEach((metric: string) => {
                const metricValue = `${network}_${metric}`;
                if (!addedKeys.has(metricValue)) {
                    addedKeys.add(metricValue);
                    metrics.push({
                        label: formatMetricLabel(network, metric),
                        value: metricValue
                    });
                }
            });
        }

        // Special handling for Klaviyo
        if (network === 'klaviyo') {
            ['email', 'sms', 'flow'].forEach(type => {
                const typeConfig = REPORT_METRICS.klaviyo[type];
                if (typeConfig?.metrics) {
                    typeConfig.metrics.forEach((metric: string) => {
                        const metricValue = `klaviyo_${type}_${metric}`;
                        if (!addedKeys.has(metricValue)) {
                            addedKeys.add(metricValue);
                            metrics.push({
                                label: formatMetricLabel('klaviyo', `${type}_${metric}`),
                                value: metricValue
                            });
                        }
                    });
                }
            });
        }

        // Special handling for GA acquisition
        if (network === 'ga') {
            const acqConfig = REPORT_METRICS.ga_acquisition;
            if (acqConfig?.metrics) {
                acqConfig.metrics.forEach((metric: string) => {
                    const metricValue = `ga_acquisition_${metric}`;
                    if (!addedKeys.has(metricValue)) {
                        addedKeys.add(metricValue);
                        metrics.push({
                            label: formatMetricLabel('ga', `acquisition_${metric}`),
                            value: metricValue
                        });
                    }
                });
            }
        }
    });

    return metrics.sort((a, b) => a.label.localeCompare(b.label));
};

// ========== NORMALIZE KEY BY DIMENSION ==========
const normalizeKeyByDimension = (dateStr: string, dimension: string): string => {
    const m = moment(dateStr);
    if (!m.isValid()) return dateStr;

    if (dimension === 'day') return m.format('YYYY-MM-DD');
    if (dimension === 'week') return m.startOf('isoWeek').format('YYYY-MM-DD');
    if (dimension === 'month') return m.format('YYYY-MM');

    return dateStr;
};

// ========== BUILD DIMENSION LABELS ==========
const buildDimensionLabels = (startDate: string, endDate: string, dimension: string): string[] => {
    const labels: string[] = [];
    const start = moment(startDate);
    const end = moment(endDate);

    if (dimension === 'day') {
        const current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
            labels.push(current.format('YYYY-MM-DD'));
            current.add(1, 'day');
        }
    } else if (dimension === 'week') {
        const current = start.clone().startOf('isoWeek');
        while (current.isSameOrBefore(end, 'week')) {
            labels.push(current.format('YYYY-MM-DD'));
            current.add(1, 'week');
        }
    } else if (dimension === 'month') {
        const current = start.clone().startOf('month');
        while (current.isSameOrBefore(end, 'month')) {
            labels.push(current.format('YYYY-MM'));
            current.add(1, 'month');
        }
    }

    return labels;
};

// ========== PARSE METRIC KEY ==========
const parseMetricKey = (metricKey: string): { network: string; field: string } => {
    const parts = metricKey.split('_');
    const network = parts[0];
    const field = parts.slice(1).join('_');
    return { network, field };
};

// ========== GET METRIC VALUE ==========
const getMetricValue = (aggregatedData: Record<string, Record<string, number>>, dateKey: string, field: string): number => {
    const data = aggregatedData[dateKey];
    if (!data) return 0;
    return Number((data[field] || 0).toFixed(2));
};

// ========== Y-AXIS INDEX ==========
const getYAxisIndex = (metricKey: string): number => {
    const rightAxisMetrics = [
        'roas', 'conv_rate', 'ctr', 'octr', 'cvr', 'aov', 'cpc', 'cpoc',
        'sessions', 'orders', 'clicks', 'impressions', 'open_rate', 'click_rate',
        'cost_per_session', 'discount_per', 'no_of_items', 'no_of_emails', 'no_of_sms', 'no_of_flows'
    ];

    const key = metricKey.split('_').slice(1).join('_');
    return rightAxisMetrics.some(m => key.includes(m)) ? 1 : 0;
};

// ========== NEW: COMPARISON RESPONSE BUILDER ==========
const buildComparisonResponse = (
    currentData: Record<string, Record<string, number>>,
    comparedData: Record<string, Record<string, number>>,
    options: {
        comparison: boolean;
        dateRange: {
            current: { start: string; end: string };
            compared: { start: string; end: string } | null;
        }
    },
    currentPayload: any[],
    comparedPayload: any[],
    metrics: readonly string[],
    rawMetrics: readonly string[]
) => {
    const currentDates = Object.keys(currentData).sort();

    // ✅ NEW: Generate compared dates even if no data exists
    let comparedDates: string[] = [];
    if (options.comparison && options.dateRange.compared) {
        // First try to get dates from actual data
        comparedDates = Object.keys(comparedData).sort();

        // If no data, generate date labels from date range
        if (comparedDates.length === 0) {
            comparedDates = buildDimensionLabels(
                options.dateRange.compared.start,
                options.dateRange.compared.end,
                'month'
            );
        }
    }

    // ✅ Current Period (same as before)
    const currentPeriod = {
        dateRange: `${options.dateRange.current.start} - ${options.dateRange.current.end}`,
        labels: currentDates,
        data: currentDates.map(date => ({
            date,
            dateRange: getMonthDateRange(date, currentPayload),
            ...currentData[date]
        }))
    };

    // ✅ NEW: Compared Period - Always return if comparison is true (with zeros)
    let comparedPeriod = null;
    if (options.comparison && options.dateRange.compared) {
        comparedPeriod = {
            dateRange: `${options.dateRange.compared.start} - ${options.dateRange.compared.end}`,
            labels: comparedDates,
            data: comparedDates.map(date => {
                const existingData = comparedData[date];

                // If data exists, use it
                if (existingData && Object.keys(existingData).length > 0) {
                    return {
                        date,
                        dateRange: getMonthDateRange(date, comparedPayload),
                        ...existingData
                    };
                }

                // ✅ NEW: Return zero-filled object for missing data
                const zeroData: Record<string, any> = {
                    date,
                    dateRange: getMonthDateRange(date, comparedPayload) || null
                };
                metrics.forEach(metric => {
                    zeroData[metric] = 0;
                });
                return zeroData;
            })
        };
    }

    // ✅ Calculate Totals
    const calculateTotals = (
        aggregatedData: Record<string, Record<string, number>>,
        rawMetricsList: readonly string[],
        allMetrics: readonly string[]
    ) => {
        const totals: Record<string, number> = {};
        allMetrics.forEach(m => totals[m] = 0);

        Object.values(aggregatedData).forEach((d: any) => {
            rawMetricsList.forEach(metric => {
                if (d[metric] !== undefined) {
                    totals[metric] = (totals[metric] || 0) + (d[metric] || 0);
                }
            });
        });

        return totals;
    };

    const currentTotals = calculateTotals(currentData, rawMetrics, metrics);

    // ✅ NEW: Always calculate compared totals if comparison is on
    let comparedTotals: Record<string, number> = {};
    if (options.comparison) {
        if (Object.keys(comparedData).length > 0) {
            comparedTotals = calculateTotals(comparedData, rawMetrics, metrics);
        } else {
            // ✅ NEW: Return zero totals if no compared data
            metrics.forEach(m => {
                comparedTotals[m] = 0;
            });
        }
    }

    // ✅ Summary with Changes
    const summary: any = {
        current_totals: currentTotals
    };

    // ✅ NEW: Always include compared_totals and changes if comparison is true
    if (options.comparison) {
        summary.compared_totals = comparedTotals;
        summary.changes = {};
        metrics.forEach(metric => {
            summary.changes[metric] = calculateChange(
                currentTotals[metric] || 0,
                comparedTotals[metric] || 0
            );
        });
    }

    return {
        dateRange: options.dateRange,
        metrics,
        current: currentPeriod,
        compared: comparedPeriod,
        summary
    };
};

// ========== EXTERNAL SPEND AGGREGATION ==========
const aggregateExternalSpend = (payload: any[], dimension: string = 'month'): Record<string, number> => {
    const result: Record<string, number> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;

    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);
        if (!result[dateKey]) {
            result[dateKey] = 0;
        }
        result[dateKey] += Number(data?.spend) || 0;
    });

    return result;
};

// ========== SHOPIFY AGGREGATION ==========
const aggregateShopifyData = async (
    payload: any[],
    dimension: string,
    metaSpendMap: Record<string, number>,
    adwordSpendMap: Record<string, number>,
    clientId: string

): Promise<Record<string, Record<string, number>>> => {
    const result: Record<string, Record<string, number>> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;

    const revenue_setting = await clientConnections
        .findOne({
            client_id: getMongoDbObjectId(clientId),  // ✅ Now clientId is available
            network: "shopify",
            status: "active"
        }).select({ "shopify_revenue_settings.divergence_report": 1, _id: 0 })
        .lean();
    console.log(revenue_setting?.shopify_revenue_settings?.divergence_report, "rerererere")
    const formula = revenue_setting?.shopify_revenue_settings?.divergence_report;
    console.log(formula, "formula")

    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);

        if (!result[dateKey]) {
            result[dateKey] = {
                gross_sales: 0,
                orders: 0,
                discounts: 0,
                sessions: 0,
                revenue: 0,
                google_cost: 0,
                meta_cost: 0,
                total_cost: 0,
                aov: 0,
                conv_rate: 0,
                discount_per: 0,
                cost_per_session: 0,
                roas: 0,
            };
        }

        result[dateKey].gross_sales += Number(data?.gross_sales) || 0;
        result[dateKey].orders += Number(data?.orders) || 0;
        result[dateKey].discounts += Math.abs(Number(data?.discounts)) || 0;
        result[dateKey].sessions += Number(data?.sessions) || 0;
        result[dateKey].revenue += calculateAggregatedShopifyRevenue({
            gross_sales: data?.gross_sales || 0,
            discounts: data?.discounts || 0,
            shipping_charges: data?.shipping_charges || 0,
            taxes: data?.taxes || 0,
            returns: data?.returns || 0,
            net_sales: data?.net_sales || 0,
        }, formula) || 0;
    });

    // Add external spend & calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];

        result[dateKey].google_cost = adwordSpendMap[dateKey] || 0;
        result[dateKey].meta_cost = metaSpendMap[dateKey] || 0;
        result[dateKey].total_cost = result[dateKey].google_cost + result[dateKey].meta_cost;

        result[dateKey].aov = d.orders > 0 ? d.revenue / d.orders : 0;
        result[dateKey].conv_rate = d.sessions > 0 ? (d.orders / d.sessions) * 100 : 0;
        result[dateKey].discount_per = d.revenue > 0 ? (d.discounts / d.revenue) * 100 : 0;
        result[dateKey].cost_per_session = d.sessions > 0 ? result[dateKey].total_cost / d.sessions : 0;
        result[dateKey].roas = result[dateKey].total_cost > 0 ? d.revenue / result[dateKey].total_cost : 0;
    });

    return result;
};

// ========== META AGGREGATION ==========
const aggregateMetaData = (payload: any[], dimension: string): Record<string, Record<string, number>> => {
    const result: Record<string, Record<string, number>> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;


    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);
        const ob =
            data?.outboundclicks ??
            data?.outbound_clicks ??
            data?.outboundClicks ?? 0;
        if (!result[dateKey]) {
            result[dateKey] = {
                revenue: 0, spend: 0, clicks: 0, impressions: 0,
                outboundclicks: 0, reach: 0, orders: 0,
                octr: 0, cpoc: 0, cvr: 0, aov: 0, roas: 0
            };
        }

        result[dateKey].clicks += Number(data?.clicks) || 0;
        result[dateKey].impressions += Number(data?.impressions) || 0;
        result[dateKey].outboundclicks += Number(ob) || 0;
        result[dateKey].reach += Number(data?.reach) || 0;
        result[dateKey].spend += Number(data?.spend) || 0;

        const purchaseValue = data?.action_values?.find((v: any) => v.action_type === 'omni_purchase');
        const orderValue = Array.isArray(data?.actions)
            ? data.actions.find((v: any) => v.action_type === "omni_purchase")
            : undefined;
        result[dateKey].revenue += Number(purchaseValue?.value) || 0;
        result[dateKey].orders += Number(orderValue?.value) || 0;
    });

    // Calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];
        const derived = calculateDerivedMetrics({
            clicks: d.clicks,
            impressions: d.impressions,
            spend: d.spend,
            orders: d.orders,
            revenue: d.revenue
        });
        result[dateKey].octr = derived.ctr;
        result[dateKey].cpoc = derived.cpc;
        result[dateKey].cvr = derived.cvr;
        result[dateKey].aov = derived.aov;
        result[dateKey].roas = derived.roas;
    });

    return result;
};

// ========== GA AGGREGATION ==========
const aggregateGAData = (
    payload: any[],
    dimension: string,
    metaSpendMap: Record<string, number>,
    adwordSpendMap: Record<string, number>
): Record<string, Record<string, number>> => {
    const result: Record<string, Record<string, number>> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;

    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);
        const channelsDataList = data?.channels;

        if (!Array.isArray(channelsDataList) || channelsDataList.length === 0) return;

        if (!result[dateKey]) {
            result[dateKey] = {
                orders: 0, revenue: 0, sessions: 0,
                google_cost: 0, meta_cost: 0, total_cost: 0,
                conv_rate: 0, aov: 0, cost_per_session: 0, roas: 0
            };
        }

        channelsDataList.forEach(channelData => {
            result[dateKey].revenue += Number(channelData?.totalRevenue) || 0;
            result[dateKey].sessions += Number(channelData?.sessions) || 0;
            result[dateKey].orders += Number(channelData?.itemsPurchased) || 0;
        });
    });

    // Add external costs & calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];

        result[dateKey].google_cost = adwordSpendMap[dateKey] || 0;
        result[dateKey].meta_cost = metaSpendMap[dateKey] || 0;
        result[dateKey].total_cost = result[dateKey].google_cost + result[dateKey].meta_cost;

        result[dateKey].conv_rate = d.sessions > 0 ? (d.orders / d.sessions) * 100 : 0;
        result[dateKey].aov = d.orders > 0 ? d.revenue / d.orders : 0;
        result[dateKey].cost_per_session = d.sessions > 0 ? result[dateKey].total_cost / d.sessions : 0;
        result[dateKey].roas = result[dateKey].total_cost > 0 ? d.revenue / result[dateKey].total_cost : 0;
    });

    return result;
};

// ========== ADWORD AGGREGATION ==========
const aggregateAdwordData = (payload: any[], dimension: string): Record<string, Record<string, number>> => {
    const result: Record<string, Record<string, number>> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;

    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);

        if (!result[dateKey]) {
            result[dateKey] = {
                revenue: 0, spend: 0, clicks: 0, impressions: 0, orders: 0,
                ctr: 0, cpc: 0, cvr: 0, aov: 0, roas: 0
            };
        }

        result[dateKey].revenue += Number(data?.revenue) || 0;
        result[dateKey].spend += Number(data?.spend) || 0;
        result[dateKey].clicks += Number(data?.clicks) || 0;
        result[dateKey].impressions += Number(data?.impressions) || 0;
        result[dateKey].orders += Number(data?.conversions) || 0;
    });

    // Calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];
        const derived = calculateDerivedMetrics({
            clicks: d.clicks,
            impressions: d.impressions,
            spend: d.spend,
            orders: d.orders,
            revenue: d.revenue
        });
        result[dateKey].ctr = derived.ctr;
        result[dateKey].cpc = derived.cpc;
        result[dateKey].cvr = derived.cvr;
        result[dateKey].aov = derived.aov;
        result[dateKey].roas = derived.roas;
    });

    return result;
};

// ========== BING AGGREGATION ==========
const aggregateBingData = (payload: any[], dimension: string): Record<string, Record<string, number>> => {
    const result: Record<string, Record<string, number>> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;

    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);

        if (!result[dateKey]) {
            result[dateKey] = {
                revenue: 0, spend: 0, clicks: 0, impressions: 0, orders: 0,
                ctr: 0, cpc: 0, cvr: 0, aov: 0, roas: 0
            };
        }

        result[dateKey].revenue += Number(data?.revenue) || 0;
        result[dateKey].spend += Number(data?.spend) || 0;
        result[dateKey].clicks += Number(data?.clicks) || 0;
        result[dateKey].impressions += Number(data?.impressions) || 0;
        result[dateKey].orders += Number(data?.conversions) || 0;
    });

    // Calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];
        const derived = calculateDerivedMetrics({
            clicks: d.clicks,
            impressions: d.impressions,
            spend: d.spend,
            orders: d.orders,
            revenue: d.revenue
        });
        result[dateKey].ctr = derived.ctr;
        result[dateKey].cpc = derived.cpc;
        result[dateKey].cvr = derived.cvr;
        result[dateKey].aov = derived.aov;
        result[dateKey].roas = derived.roas;
    });

    return result;
};

// ========== CRITEO AGGREGATION ==========
const aggregateCriteoData = (payload: any[], dimension: string): Record<string, Record<string, number>> => {
    const result: Record<string, Record<string, number>> = {};

    if (!Array.isArray(payload) || payload.length === 0) return result;

    payload.forEach(data => {
        const dateKey = normalizeKeyByDimension(data?.date, dimension);

        if (!result[dateKey]) {
            result[dateKey] = {
                revenue: 0, spend: 0, clicks: 0, impressions: 0, orders: 0,
                ctr: 0, cpc: 0, cvr: 0, aov: 0, roas: 0
            };
        }

        result[dateKey].revenue += Number(data?.revenueGeneratedAllPc30d) || 0;
        result[dateKey].spend += Number(data?.advertiserCost) || 0;
        result[dateKey].clicks += Number(data?.clicks) || 0;
        result[dateKey].impressions += Number(data?.impressions) || 0;
        result[dateKey].orders += Number(data?.orders) || 0;
    });

    // Calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];
        const derived = calculateDerivedMetrics({
            clicks: d.clicks,
            impressions: d.impressions,
            spend: d.spend,
            orders: d.orders,
            revenue: d.revenue
        });
        result[dateKey].ctr = derived.ctr;
        result[dateKey].cpc = derived.cpc;
        result[dateKey].cvr = derived.cvr;
        result[dateKey].aov = derived.aov;
        result[dateKey].roas = derived.roas;
    });

    return result;
};

// ========== KLAVIYO AGGREGATION ==========
const aggregateKlaviyoData = (
    payload: any[],
    dimension: string,
    type: "email" | "sms" | "flow"
): Record<string, Record<string, number>> => {
    const result: Record<string, Record<string, number>> = {};

    const hasValidStatistics = (item: any): boolean => {
        return item?.statistics && Object.keys(item.statistics).length > 0;
    };

    if (!Array.isArray(payload) || payload.length === 0) return result;

    payload.forEach(record => {
        const dateKey = normalizeKeyByDimension(record?.date, dimension);
        const campaigns = record?.campaigns || [];
        const flows = record?.flows || [];

        if (!result[dateKey]) {
            result[dateKey] = {
                delivered: 0,
                bounced: 0,
                revenue: 0,
                recipients: 0,
                opens_unique: 0,
                clicks_unique: 0,
                no_of_items: 0,
                open_rate: 0,
                click_rate: 0
            };
        }

        let items: any[] = [];

        if (type === "email") {
            items = campaigns.filter((c: any) => c.channel === "email" && hasValidStatistics(c));
        } else if (type === "sms") {
            items = campaigns.filter((c: any) => c.channel === "sms" && hasValidStatistics(c));
        } else if (type === "flow") {
            items = flows.filter((f: any) => hasValidStatistics(f));
        }

        items.forEach((item: any) => {
            const stats = item.statistics;

            result[dateKey].no_of_items += 1; // ✅ NEW

            result[dateKey].delivered += Number(stats?.delivered) || 0;
            result[dateKey].bounced += Number(stats?.bounced) || 0;
            result[dateKey].revenue += Number(stats?.conversion_value) || 0;
            result[dateKey].recipients += Number(stats?.recipients) || 0;
            result[dateKey].opens_unique += Number(stats?.opens_unique) || 0;
            result[dateKey].clicks_unique += Number(stats?.clicks_unique) || 0;
        });
    });

    // Calculate derived metrics
    Object.keys(result).forEach(dateKey => {
        const d = result[dateKey];
        // d.no_of_items = d.delivered + d.bounced;
        d.open_rate = d.delivered > 0 ? (d.opens_unique / d.delivered) * 100 : 0;
        d.click_rate = d.delivered > 0 ? (d.clicks_unique / d.delivered) * 100 : 0;
    });

    return result;
};

// ========== MASTER AGGREGATOR ==========
const aggregateNetworkData = async (
    network: string,
    payload: any[],
    dimension: string,
    metaSpend: Record<string, number> = {},
    adwordSpend: Record<string, number> = {},
    klaviyoType: "email" | "sms" | "flow" = "email",
    clientId?: string
): Promise<Record<string, Record<string, number>>> => {
    switch (network) {
        case 'shopify':
            return await aggregateShopifyData(payload, dimension, metaSpend, adwordSpend, clientId);
        case 'meta':
            return aggregateMetaData(payload, dimension);
        case 'ga':
            return aggregateGAData(payload, dimension, metaSpend, adwordSpend);
        case 'adword':
            return aggregateAdwordData(payload, dimension);
        case 'bing':
            return aggregateBingData(payload, dimension);
        case 'criteo':
            return aggregateCriteoData(payload, dimension);
        case 'klaviyo':
            return aggregateKlaviyoData(payload, dimension, klaviyoType);
        default:
            return {};
    }
};

// ==========================================================================
// ✅ COMMON DATA FETCHER (Used by both APIs)
// ==========================================================================

export const fetchNetworkData = async (
    clientId: string,
    startDate: string,
    endDate: string,
    comparison: boolean,
    compareStartDate?: string,
    compareEndDate?: string
) => {
    const divergenceModuleNetworks = ["shopify", "meta", "ga", "adword", "bing", "criteo", "klaviyo"];

    const connections = await clientConnections.find({
        client_id: clientId,
        status: "active"
    }).select("_id network").lean();

    const validNetworkIds = connections.map((conn) => conn._id);
    const networks = connections.map((conn) => conn.network);
    const validnetworksList = divergenceModuleNetworks.filter(v => networks.includes(v));

    // Calculate min & max date
    let minDate = startDate;
    let maxDate = endDate;

    if (comparison && compareStartDate && compareEndDate) {
        minDate = new Date(startDate) < new Date(compareStartDate) ? startDate : compareStartDate;
        maxDate = new Date(endDate) > new Date(compareEndDate) ? endDate : compareEndDate;
    }

    // Fetch data from DB
    const yearsList = getRangeBetweenDates(minDate, maxDate, "year");
    let allDataRecords: any[] = [];

    for (const year of yearsList) {
        const modelName = getCentralStorageModel(`central_storage_${year}`);
        const yearlyRecords = await modelName.aggregate([
            {
                $match: {
                    client_id: getMongoDbObjectId(clientId),
                    connection_id: { $in: validNetworkIds },
                    date: {
                        $gte: getUtcDate(minDate),
                        $lte: getUtcDate(maxDate, "end")
                    }
                }
            },
            {
                $group: {
                    _id: "$network",
                    records: {
                        $push: {
                            date: "$date",
                            data: "$data",
                            updatedAt: "$updatedAt"
                        }
                    },
                    lastUpdated: { $max: "$updatedAt" }
                }
            },
        ]);
        allDataRecords.push(...yearlyRecords);
    }

    let overallLastUpdated: Date | null = null;
    allDataRecords.forEach(item => {
        if (item.lastUpdated) {
            const itemDate = new Date(item.lastUpdated);
            if (!overallLastUpdated || itemDate > overallLastUpdated) {
                overallLastUpdated = itemDate;
            }
        }
    });

    // Merge records from multiple years
    const mergedRecords: Record<string, any[]> = {};
    allDataRecords.forEach(item => {
        const network = item._id;
        if (!mergedRecords[network]) {
            mergedRecords[network] = [];
        }
        mergedRecords[network].push(...item.records);
    });

    // ✅ NEW: Initialize all connected networks with empty arrays
    const networkDataMap: Record<string, any[]> = {};
    const comparedNetworkDataMap: Record<string, any[]> = {};

    // ✅ Initialize ALL connected networks (even if no data)
    validnetworksList.forEach(network => {
        networkDataMap[network] = [];
        comparedNetworkDataMap[network] = [];
    });

    const currentStartDate = new Date(getUtcDate(startDate));
    const currentEndDate = new Date(getUtcDate(endDate, "end"));
    const comparedStartDate = comparison ? new Date(getUtcDate(compareStartDate!)) : null;
    const comparedEndDate = comparison ? new Date(getUtcDate(compareEndDate!, "end")) : null;

    Object.keys(mergedRecords).forEach(network => {
        const currentRecords: any[] = [];
        const comparedRecords: any[] = [];

        mergedRecords[network].forEach((record: any) => {
            const recordDate = new Date(record.date);

            if (recordDate >= currentStartDate && recordDate <= currentEndDate) {
                currentRecords.push({ ...record.data, date: record.date });
            }

            if (comparison && comparedStartDate && comparedEndDate) {
                if (recordDate >= comparedStartDate && recordDate <= comparedEndDate) {
                    comparedRecords.push({ ...record.data, date: record.date });
                }
            }
        });

        // ✅ Append to existing (already initialized) arrays
        networkDataMap[network] = currentRecords;
        comparedNetworkDataMap[network] = comparedRecords;
    });

    return {
        networkDataMap,
        comparedNetworkDataMap,
        validnetworksList,
        connections,
        lastUpdated: overallLastUpdated
    };
};
// ==========================================================================
// ✅ DIVERGENCE REPORT API
// ==========================================================================

export const divergenceReport = async (req, res) => {
    try {
        const limit = pLimit(3);
        const module_key = req?.header('x-module-key');
        const userId = (req as any).user?._id || null;

        const { clientId, startDate, endDate, comparison, compareStartDate, compareEndDate } = req.body;

        // Fetch network data
        const { networkDataMap, comparedNetworkDataMap, validnetworksList, connections, lastUpdated } = await fetchNetworkData(
            clientId, startDate, endDate, comparison, compareStartDate, compareEndDate
        );
        let shopifyFormula: any; // undefined by default

        if (validnetworksList.includes("shopify")) {
            const revenue_setting = await clientConnections
                .findOne({
                    client_id: getMongoDbObjectId(clientId),
                    network: "shopify",
                    status: "active"
                })
                .select({ "shopify_revenue_settings.divergence_report": 1, _id: 0 })
                .lean();

            shopifyFormula = revenue_setting?.shopify_revenue_settings?.divergence_report; // can be undefined
        }


        // Generate available metrics
        const availableMetrics = generateAvailableMetrics(connections);
        const formattedLastUpdated = lastUpdated
            ? moment(lastUpdated).utcOffset('+05:30').format('YYYY-MM-DD HH:mm:ss')
            : null;


        // Fetchers
        const fetchers: Record<string, (currentPayload: any[], comparedPayload: any[], options: any, externalData?: any, clientId?: string) => Promise<any>> = {
            shopify: fetchShopifyData,
            ga: fetchGAData,
            meta: fetchMetaData,
            adword: fetchAdwordData,
            bing: fetchBingData,
            criteo: fetchCriteoData,
            klaviyo: fetchKlaviyoData,
        };

        const tasks = validnetworksList.filter(network => fetchers[network])
            .map(network => async () => {
                const currentPayload = networkDataMap[network] || [];
                const comparedPayload = comparedNetworkDataMap[network] || [];
                const options = {
                    comparison: comparison || false,
                    dateRange: {
                        current: { start: startDate, end: endDate },
                        compared: comparison ? { start: compareStartDate, end: compareEndDate } : null
                    }
                };

                let externalData = undefined;
                if (network === "shopify" || network === "ga") {
                    externalData = {
                        meta: {
                            current: networkDataMap["meta"] || [],
                            compared: comparedNetworkDataMap["meta"] || []
                        },
                        adword: {
                            current: networkDataMap["adword"] || [],
                            compared: comparedNetworkDataMap["adword"] || []
                        }
                    };
                }

                // ✅ Pass clientId to fetcher
                const data = await fetchers[network]?.(currentPayload, comparedPayload, options, externalData, clientId);
                return {
                    network, data, ...(network === "shopify" && shopifyFormula ? { formula: shopifyFormula } : {}),  // ✅ add this
                };
            });
        const results = await Promise.allSettled(
            tasks.map(task => limit(task))
        );

        const cacheKey = `${module_key}_${userId}`;

        // ✅ Redis me jo data store karna hai
        const redisPayload = {
            userId,
            clientId,
            startDate,
            endDate,
            comparison,
            compareStartDate,
            compareEndDate,
            storedAt: new Date()
        };

        // ✅ 1️⃣ SET in Redis
        await redisClient.set(
            cacheKey,
            JSON.stringify(redisPayload),
            { EX: 86400 } // 5 min expiry
        );

        console.log("✅ Data SET in Redis");

        res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Divergence report fetched successfully.',
            data: {
                available_metrics: availableMetrics,
                results: results,
                last_updated: formattedLastUpdated,  // ✅ Added last_updated

            }
        });
    } catch (error) {
        return res.status(422).json({ status_code: 422, success: false, message: "Error in divergence report", data: error });
    }
};

// ==========================================================================
// ✅ CHART DATA API
// ==========================================================================

export const getChartData = async (req, res) => {
    try {
        const {
            clientId,
            startDate,
            endDate,
            comparison = false,
            compareStartDate,
            compareEndDate,
            metrics,
            comparison_metrics,
            dimension = 'month'
        } = req.body;

        // Validation - Required fields
        if (!clientId || !startDate || !endDate || !metrics) {
            return res.status(400).json({
                status: "error",
                status_code: 400,
                message: "Missing required fields: clientId, startDate, endDate, metrics"
            });
        }

        // Parse metrics
        const primaryMetric = parseMetricKey(metrics);
        const secondaryMetric = comparison_metrics ? parseMetricKey(comparison_metrics) : null;

        // Fetch network data
        const { networkDataMap, comparedNetworkDataMap, connections } = await fetchNetworkData(
            clientId, startDate, endDate, comparison, compareStartDate, compareEndDate
        );

        const connectedNetworks = connections.map((conn) => conn.network);

        // ✅ Check if primary metric network is connected - Return empty data instead of error
        const isPrimaryConnected = connectedNetworks.includes(primaryMetric.network);
        const isSecondaryConnected = secondaryMetric ? connectedNetworks.includes(secondaryMetric.network) : true;

        // Build dimension labels
        const currentLabels = buildDimensionLabels(startDate, endDate, dimension);
        const previousLabels = comparison && compareStartDate && compareEndDate
            ? buildDimensionLabels(compareStartDate, compareEndDate, dimension)
            : [];

        // ✅ If primary network not connected, return empty chart data
        if (!isPrimaryConnected) {
            return res.status(200).json({
                status: "success",
                status_code: 200,
                message: `Network '${primaryMetric.network}' is not connected. Returning empty chart data.`,
                data: {
                    dimension,
                    categories: currentLabels,
                    series: [
                        {
                            name: formatMetricLabel(primaryMetric.network, primaryMetric.field),
                            data: currentLabels.map(() => 0),  // Empty data
                            yAxisIndex: getYAxisIndex(metrics),
                            connected: false  // ✅ Flag to indicate not connected
                        }
                    ],
                    comparison: comparison ? {
                        labels: previousLabels,
                        series: {
                            [primaryMetric.field]: previousLabels.map(() => 0)
                        }
                    } : null,
                    warnings: [`Network '${primaryMetric.network}' is not connected`]
                }
            });
        }

        // External spend
        const currentMetaSpend = aggregateExternalSpend(networkDataMap["meta"] || [], dimension);
        const currentAdwordSpend = aggregateExternalSpend(networkDataMap["adword"] || [], dimension);
        const previousMetaSpend = aggregateExternalSpend(comparedNetworkDataMap["meta"] || [], dimension);
        const previousAdwordSpend = aggregateExternalSpend(comparedNetworkDataMap["adword"] || [], dimension);

        // Determine Klaviyo type
        const getKlaviyoType = (field: string): "email" | "sms" | "flow" => {
            if (field.includes('email')) return 'email';
            if (field.includes('sms')) return 'sms';
            return 'flow';
        };

        // Aggregate primary metric
        const primaryKlaviyoType = getKlaviyoType(primaryMetric.field);
        const primaryCurrentAgg = await aggregateNetworkData(
            primaryMetric.network,
            networkDataMap[primaryMetric.network] || [],
            dimension,
            currentMetaSpend,
            currentAdwordSpend,
            primaryKlaviyoType
        );
        const primaryPreviousAgg = comparison
            ? await aggregateNetworkData(
                primaryMetric.network,
                comparedNetworkDataMap[primaryMetric.network] || [],
                dimension,
                previousMetaSpend,
                previousAdwordSpend,
                primaryKlaviyoType
            )
            : {};

        // Aggregate secondary metric (only if connected)
        let secondaryCurrentAgg: Record<string, Record<string, number>> = {};
        let secondaryPreviousAgg: Record<string, Record<string, number>> = {};

        if (secondaryMetric && isSecondaryConnected) {
            const secondaryKlaviyoType = getKlaviyoType(secondaryMetric.field);
            secondaryCurrentAgg = await aggregateNetworkData(
                secondaryMetric.network,
                networkDataMap[secondaryMetric.network] || [],
                dimension,
                currentMetaSpend,
                currentAdwordSpend,
                secondaryKlaviyoType
            );
            secondaryPreviousAgg = comparison
                ? await aggregateNetworkData(
                    secondaryMetric.network,
                    comparedNetworkDataMap[secondaryMetric.network] || [],
                    dimension,
                    previousMetaSpend,
                    previousAdwordSpend,
                    secondaryKlaviyoType
                )
                : {};
        }

        // Build series
        const series: any[] = [];
        const warnings: string[] = [];

        // Primary metric series
        series.push({
            name: formatMetricLabel(primaryMetric.network, primaryMetric.field),
            data: currentLabels.map(label => getMetricValue(primaryCurrentAgg, label, primaryMetric.field)),
            yAxisIndex: getYAxisIndex(metrics),
            connected: true
        });

        // Secondary metric series
        if (secondaryMetric && comparison_metrics) {
            if (isSecondaryConnected) {
                series.push({
                    name: formatMetricLabel(secondaryMetric.network, secondaryMetric.field),
                    data: currentLabels.map(label => getMetricValue(secondaryCurrentAgg, label, secondaryMetric.field)),
                    yAxisIndex: getYAxisIndex(comparison_metrics),
                    connected: true
                });
            } else {
                // ✅ Secondary not connected - add empty series with warning
                series.push({
                    name: formatMetricLabel(secondaryMetric.network, secondaryMetric.field),
                    data: currentLabels.map(() => 0),
                    yAxisIndex: getYAxisIndex(comparison_metrics),
                    connected: false
                });
                warnings.push(`Network '${secondaryMetric.network}' is not connected`);
            }
        }

        // Build comparison
        let comparisonData: any = null;

        if (comparison && previousLabels.length > 0) {
            const comparisonSeries: Record<string, number[]> = {};

            comparisonSeries[primaryMetric.field] = previousLabels.map(label =>
                getMetricValue(primaryPreviousAgg, label, primaryMetric.field)
            );

            if (secondaryMetric) {
                if (isSecondaryConnected) {
                    comparisonSeries[secondaryMetric.field] = previousLabels.map(label =>
                        getMetricValue(secondaryPreviousAgg, label, secondaryMetric.field)
                    );
                } else {
                    comparisonSeries[secondaryMetric.field] = previousLabels.map(() => 0);
                }
            }

            comparisonData = {
                labels: previousLabels,
                series: comparisonSeries
            };
        }

        // Response
        const responseData: any = {
            dimension,
            categories: currentLabels,
            series,
            comparison: comparisonData
        };

        // ✅ Add warnings if any network not connected
        if (warnings.length > 0) {
            responseData.warnings = warnings;
        }

        return res.status(200).json({
            status: "success",
            status_code: 200,
            message: "Chart data retrieved successfully!",
            data: responseData
        });

    } catch (error) {
        console.error("Chart Data API Error:", error);
        return res.status(422).json({
            status: "error",
            status_code: 422,
            message: "Error fetching chart data",
            error: error instanceof Error ? error.message : error
        });
    }
};


async function fetchShopifyData(
    currentPayload: any[],
    comparedPayload: any[] = [],
    options: {
        comparison: boolean;
        dateRange: {
            current: { start: string; end: string };
            compared: { start: string; end: string } | null;
        }
    },
    externalData?: {
        meta: { current: any[]; compared: any[] };
        adword: { current: any[]; compared: any[] };
    },
    clientId?: string
) {
    const { metrics, rawMetrics } = REPORT_METRICS.shopify;

    // Aggregate external spend
    const currentMetaSpend = aggregateExternalSpend(externalData?.meta?.current || [], 'month');
    const currentAdwordSpend = aggregateExternalSpend(externalData?.adword?.current || [], 'month');
    const comparedMetaSpend = aggregateExternalSpend(externalData?.meta?.compared || [], 'month');
    const comparedAdwordSpend = aggregateExternalSpend(externalData?.adword?.compared || [], 'month');

    // ✅ NEW: Helper for zero-filled Shopify data
    const getZeroFilledShopifyData = (dateRange: { start: string; end: string } | null) => {
        if (!dateRange) return {};
        const result: Record<string, Record<string, number>> = {};
        const labels = buildDimensionLabels(dateRange.start, dateRange.end, 'month');
        labels.forEach(dateKey => {
            result[dateKey] = {
                gross_sales: 0, orders: 0, discounts: 0, sessions: 0,
                revenue: 0, google_cost: 0, meta_cost: 0, total_cost: 0,
                aov: 0, conv_rate: 0, discount_per: 0, cost_per_session: 0, roas: 0
            };
        });
        return result;
    };

    // ✅ NEW: Current data with zero-fill if empty
    let currentData = await aggregateShopifyData(currentPayload, 'month', currentMetaSpend, currentAdwordSpend, clientId!);
    if (Object.keys(currentData).length === 0) {
        currentData = getZeroFilledShopifyData(options.dateRange.current);
    }

    // ✅ Compared data with zero-fill
    let comparedData: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedData = await aggregateShopifyData(comparedPayload, 'month', comparedMetaSpend, comparedAdwordSpend, clientId!);
        if (Object.keys(comparedData).length === 0 && options.dateRange.compared) {
            comparedData = getZeroFilledShopifyData(options.dateRange.compared);
        }
    }

    // ✅ Calculate derived metrics for totals
    const addDerivedMetrics = (totals: Record<string, number>) => {
        totals.aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;
        totals.conv_rate = totals.sessions > 0 ? (totals.orders / totals.sessions) * 100 : 0;
        totals.discount_per = totals.revenue > 0 ? (totals.discounts / totals.revenue) * 100 : 0;
        totals.cost_per_session = totals.sessions > 0 ? totals.total_cost / totals.sessions : 0;
        totals.roas = totals.total_cost > 0 ? totals.revenue / totals.total_cost : 0;
        return totals;
    };

    const response = buildComparisonResponse(
        currentData,
        comparedData,
        options,
        currentPayload,
        comparedPayload,
        metrics,
        rawMetrics
    );

    if (response.summary.current_totals) {
        response.summary.current_totals = addDerivedMetrics(response.summary.current_totals);
    }
    if (response.summary.compared_totals) {
        response.summary.compared_totals = addDerivedMetrics(response.summary.compared_totals);
    }

    if (options.comparison && response.summary.compared_totals) {
        metrics.forEach(metric => {
            response.summary.changes[metric] = calculateChange(
                response.summary.current_totals[metric] || 0,
                response.summary.compared_totals[metric] || 0
            );
        });
    }

    return response;
}

async function fetchMetaData(
    currentPayload: any[],
    comparedPayload: any[] = [],
    options: {
        comparison: boolean;
        dateRange: {
            current: { start: string; end: string };
            compared: { start: string; end: string } | null;
        }
    }
) {
    const { metrics, rawMetrics } = REPORT_METRICS.meta;

    // ✅ NEW: Helper for zero-filled Meta data
    const getZeroFilledMetaData = (dateRange: { start: string; end: string } | null) => {
        if (!dateRange) return {};
        const result: Record<string, Record<string, number>> = {};
        const labels = buildDimensionLabels(dateRange.start, dateRange.end, 'month');
        labels.forEach(dateKey => {
            result[dateKey] = {
                revenue: 0, spend: 0, clicks: 0, impressions: 0,
                outboundclicks: 0, reach: 0, orders: 0,
                octr: 0, cpoc: 0, cvr: 0, aov: 0, roas: 0
            };
        });
        return result;
    };

    // ✅ NEW: Current data with zero-fill if empty
    let currentData = aggregateMetaData(currentPayload, 'month');
    if (Object.keys(currentData).length === 0) {
        currentData = getZeroFilledMetaData(options.dateRange.current);
    }

    // ✅ Compared data with zero-fill
    let comparedData: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedData = aggregateMetaData(comparedPayload, 'month');
        if (Object.keys(comparedData).length === 0 && options.dateRange.compared) {
            comparedData = getZeroFilledMetaData(options.dateRange.compared);
        }
    }

    const addDerivedMetrics = (totals: Record<string, number>) => {
        const derived = calculateDerivedMetrics({
            clicks: totals.clicks || 0,
            impressions: totals.impressions || 0,
            spend: totals.spend || 0,
            orders: totals.orders || 0,
            revenue: totals.revenue || 0
        });
        totals.octr = derived.ctr;
        totals.cpoc = derived.cpc;
        totals.cvr = derived.cvr;
        totals.aov = derived.aov;
        totals.roas = derived.roas;
        return totals;
    };

    const response = buildComparisonResponse(
        currentData,
        comparedData,
        options,
        currentPayload,
        comparedPayload,
        metrics,
        rawMetrics
    );

    if (response.summary.current_totals) {
        response.summary.current_totals = addDerivedMetrics(response.summary.current_totals);
    }
    if (response.summary.compared_totals) {
        response.summary.compared_totals = addDerivedMetrics(response.summary.compared_totals);
    }

    if (options.comparison && response.summary.compared_totals) {
        metrics.forEach(metric => {
            response.summary.changes[metric] = calculateChange(
                response.summary.current_totals[metric] || 0,
                response.summary.compared_totals[metric] || 0
            );
        });
    }

    return response;
}
// ========== GENERIC FETCHER FACTORY ==========
const createGenericFetcher = (
    aggregateFn: (payload: any[], dimension: string) => Record<string, Record<string, number>>,
    metrics: readonly string[],
    rawMetrics: readonly string[],
    derivedMetricsFn?: (totals: Record<string, number>) => Record<string, number>,
    // ✅ NEW: Add zero structure template
    zeroStructure?: Record<string, number>
) => {
    return async (
        currentPayload: any[],
        comparedPayload: any[] = [],
        options: {
            comparison: boolean;
            dateRange: {
                current: { start: string; end: string };
                compared: { start: string; end: string } | null;
            }
        }
    ) => {
        // ✅ NEW: Helper for zero-filled data
        const getZeroFilledData = (dateRange: { start: string; end: string } | null) => {
            if (!dateRange) return {};
            const result: Record<string, Record<string, number>> = {};
            const labels = buildDimensionLabels(dateRange.start, dateRange.end, 'month');
            const defaultZero = zeroStructure || Object.fromEntries(metrics.map(m => [m, 0]));
            labels.forEach(dateKey => {
                result[dateKey] = { ...defaultZero };
            });
            return result;
        };

        // ✅ NEW: Current data with zero-fill if empty
        let currentData = aggregateFn(currentPayload, 'month');
        if (Object.keys(currentData).length === 0) {
            currentData = getZeroFilledData(options.dateRange.current);
        }

        // ✅ Compared data with zero-fill
        let comparedData: Record<string, Record<string, number>> = {};
        if (options.comparison) {
            comparedData = aggregateFn(comparedPayload, 'month');
            if (Object.keys(comparedData).length === 0 && options.dateRange.compared) {
                comparedData = getZeroFilledData(options.dateRange.compared);
            }
        }

        const response = buildComparisonResponse(
            currentData,
            comparedData,
            options,
            currentPayload,
            comparedPayload,
            metrics,
            rawMetrics
        );

        if (derivedMetricsFn) {
            if (response.summary.current_totals) {
                response.summary.current_totals = derivedMetricsFn(response.summary.current_totals);
            }
            if (response.summary.compared_totals) {
                response.summary.compared_totals = derivedMetricsFn(response.summary.compared_totals);
            }

            if (options.comparison && response.summary.compared_totals) {
                metrics.forEach(metric => {
                    response.summary.changes[metric] = calculateChange(
                        response.summary.current_totals[metric] || 0,
                        response.summary.compared_totals[metric] || 0
                    );
                });
            }
        }

        return response;
    };
};

// ✅ Updated fetchers with zero structure
const fetchAdwordData = createGenericFetcher(
    aggregateAdwordData,
    REPORT_METRICS.adword.metrics,
    REPORT_METRICS.adword.rawMetrics,
    (totals) => {
        const derived = calculateDerivedMetrics({
            clicks: totals.clicks || 0,
            impressions: totals.impressions || 0,
            spend: totals.spend || 0,
            orders: totals.orders || 0,
            revenue: totals.revenue || 0
        });
        return { ...totals, ...derived };
    },
    { revenue: 0, spend: 0, clicks: 0, impressions: 0, orders: 0, ctr: 0, cpc: 0, cvr: 0, aov: 0, roas: 0 }
);

const fetchBingData = createGenericFetcher(
    aggregateBingData,
    REPORT_METRICS.bing.metrics,
    REPORT_METRICS.bing.rawMetrics,
    (totals) => {
        const derived = calculateDerivedMetrics({
            clicks: totals.clicks || 0,
            impressions: totals.impressions || 0,
            spend: totals.spend || 0,
            orders: totals.orders || 0,
            revenue: totals.revenue || 0
        });
        return { ...totals, ...derived };
    },
    { revenue: 0, spend: 0, clicks: 0, impressions: 0, orders: 0, ctr: 0, cpc: 0, cvr: 0, aov: 0, roas: 0 }
);

const fetchCriteoData = createGenericFetcher(
    aggregateCriteoData,
    REPORT_METRICS.criteo.metrics,
    REPORT_METRICS.criteo.rawMetrics,
    (totals) => {
        const derived = calculateDerivedMetrics({
            clicks: totals.clicks || 0,
            impressions: totals.impressions || 0,
            spend: totals.spend || 0,
            orders: totals.orders || 0,
            revenue: totals.revenue || 0
        });
        return { ...totals, ...derived };
    },
    { revenue: 0, spend: 0, clicks: 0, impressions: 0, orders: 0, ctr: 0, cpc: 0, cvr: 0, aov: 0, roas: 0 }
);


async function fetchGAData(
    currentPayload: any[],
    comparedPayload: any[] = [],
    options: {
        comparison: boolean;
        dateRange: {
            current: { start: string; end: string };
            compared: { start: string; end: string } | null;
        }
    },
    externalData?: {
        meta: { current: any[]; compared: any[] };
        adword: { current: any[]; compared: any[] };
    }
) {
    const allowedChannels = ["Organic Search", "Organic Social", "Organic Shopping", "Referral", "Unassigned", "Direct"];

    // External spend
    const currentMetaSpend = aggregateExternalSpend(externalData?.meta?.current || [], 'month');
    const currentAdwordSpend = aggregateExternalSpend(externalData?.adword?.current || [], 'month');
    const comparedMetaSpend = aggregateExternalSpend(externalData?.meta?.compared || [], 'month');
    const comparedAdwordSpend = aggregateExternalSpend(externalData?.adword?.compared || [], 'month');

    const getZeroFilledGAData = (dateRange: { start: string; end: string } | null) => {
        if (!dateRange) return {};
        const result: Record<string, Record<string, number>> = {};
        const labels = buildDimensionLabels(dateRange.start, dateRange.end, 'month');
        labels.forEach(dateKey => {
            result[dateKey] = {
                orders: 0, revenue: 0, sessions: 0,
                google_cost: 0, meta_cost: 0, total_cost: 0,
                conv_rate: 0, aov: 0, cost_per_session: 0, roas: 0
            };
        });
        return result;
    };

    // ✅ NEW: Current data with zero-fill if empty
    let currentData = aggregateGAData(currentPayload, 'month', currentMetaSpend, currentAdwordSpend);
    if (Object.keys(currentData).length === 0) {
        currentData = getZeroFilledGAData(options.dateRange.current);
    }

    // ✅ NEW: Always create compared data structure if comparison is on
    // Compared data with zero-fill
    let comparedData: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedData = aggregateGAData(comparedPayload, 'month', comparedMetaSpend, comparedAdwordSpend);
        if (Object.keys(comparedData).length === 0 && options.dateRange.compared) {
            comparedData = getZeroFilledGAData(options.dateRange.compared);
        }
    }

    // ========== ACQUISITION DATA AGGREGATION ==========
    const aggregateAcquisitionData = (payload: any[]): Record<string, Record<string, number>> => {
        const result: Record<string, Record<string, number>> = {};

        allowedChannels.forEach(channel => {
            result[channel] = {
                sessions: 0, revenue: 0, orders: 0,
                engagedSessions: 0, newUsers: 0, averageSessionDuration: 0,
                bounce_rate: 0, avg_engagement_time_per_session: 0, conv_rate: 0, new_users: 0
            };
        });

        if (!Array.isArray(payload) || payload.length === 0) return result;

        payload.forEach(data => {
            const channelsDataList = data?.channels;
            if (!Array.isArray(channelsDataList) || channelsDataList.length === 0) return;

            channelsDataList.forEach(channelData => {
                const channelName = channelData?.channel || "";
                if (!allowedChannels.includes(channelName)) return;

                result[channelName].sessions += Number(channelData?.sessions) || 0;
                result[channelName].revenue += Number(channelData?.totalRevenue) || 0;
                result[channelName].orders += Number(channelData?.itemsPurchased) || 0;
                result[channelName].engagedSessions += Number(channelData?.engagedSessions) || 0;
                result[channelName].newUsers += Number(channelData?.newUsers) || 0;
                result[channelName].averageSessionDuration += Number(channelData?.averageSessionDuration) || 0;
            });
        });

        // Calculate derived metrics per channel
        allowedChannels.forEach(channel => {
            const d = result[channel];
            result[channel].bounce_rate = d.sessions > 0 ? ((d.sessions - d.engagedSessions) / d.sessions) * 100 : 0;
            result[channel].avg_engagement_time_per_session = d.averageSessionDuration;
            result[channel].conv_rate = d.sessions > 0 ? (d.orders / d.sessions) * 100 : 0;
            result[channel].new_users = d.newUsers;
        });

        return result;
    };

    const currentAcquisition = aggregateAcquisitionData(currentPayload);
    let comparedAcquisition: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedAcquisition = aggregateAcquisitionData(comparedPayload);

        // ✅ NEW: If no data, create zero-filled structure for all channels
        if (Object.keys(comparedAcquisition).length === 0 ||
            !allowedChannels.some(ch => comparedAcquisition[ch]?.sessions > 0)) {
            allowedChannels.forEach(channel => {
                comparedAcquisition[channel] = {
                    sessions: 0, revenue: 0, orders: 0,
                    engagedSessions: 0, newUsers: 0, averageSessionDuration: 0,
                    bounce_rate: 0, avg_engagement_time_per_session: 0, conv_rate: 0, new_users: 0
                };
            });
        }
    }
    // ========== MAIN DATA STRUCTURE ==========
    const { metrics, rawMetrics } = REPORT_METRICS.ga;

    const currentDates = Object.keys(currentData).sort();
    const comparedDates = Object.keys(comparedData).sort();

    // ✅ Current Period
    const currentPeriod = {
        dateRange: `${options.dateRange.current.start} - ${options.dateRange.current.end}`,
        labels: currentDates,
        data: currentDates.map(date => ({
            date,
            dateRange: getMonthDateRange(date, currentPayload),
            ...currentData[date]
        }))
    };

    // ✅ Compared Period
    let comparedPeriod = null;
    if (options.comparison && options.dateRange.compared) {  // ✅ Correct condition
        comparedPeriod = {
            dateRange: `${options.dateRange.compared.start} - ${options.dateRange.compared.end}`,
            labels: comparedDates,
            data: comparedDates.map(date => ({
                date,
                dateRange: getMonthDateRange(date, comparedPayload),
                ...comparedData[date]
            }))
        };
    }

    // ========== MAIN TOTALS ==========
    const calculateMainTotals = (
        aggregatedData: Record<string, any>,
        metaSpendMap: Record<string, number>,
        adwordSpendMap: Record<string, number>
    ) => {
        const totals: Record<string, number> = {
            orders: 0, revenue: 0, sessions: 0,
            google_cost: 0, meta_cost: 0, total_cost: 0,
            conv_rate: 0, aov: 0, cost_per_session: 0, roas: 0
        };

        Object.values(aggregatedData).forEach((d: any) => {
            totals.orders += d.orders || 0;
            totals.revenue += d.revenue || 0;
            totals.sessions += d.sessions || 0;
        });

        totals.google_cost = Object.values(adwordSpendMap).reduce((sum, val) => sum + val, 0);
        totals.meta_cost = Object.values(metaSpendMap).reduce((sum, val) => sum + val, 0);
        totals.total_cost = totals.google_cost + totals.meta_cost;

        // Derived metrics
        totals.conv_rate = totals.sessions > 0 ? (totals.orders / totals.sessions) * 100 : 0;
        totals.aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;
        totals.cost_per_session = totals.sessions > 0 ? totals.total_cost / totals.sessions : 0;
        totals.roas = totals.total_cost > 0 ? totals.revenue / totals.total_cost : 0;

        return totals;
    };

    const currentMainTotals = calculateMainTotals(currentData, currentMetaSpend, currentAdwordSpend);
    const comparedMainTotals = options.comparison
        ? calculateMainTotals(comparedData, comparedMetaSpend, comparedAdwordSpend)
        : null;

    // ✅ Main Summary
    const summary: any = {
        current_totals: currentMainTotals
    };

    if (options.comparison && comparedMainTotals) {
        summary.compared_totals = comparedMainTotals;
        summary.changes = {};
        metrics.forEach(metric => {
            summary.changes[metric] = calculateChange(
                currentMainTotals[metric] || 0,
                comparedMainTotals[metric] || 0
            );
        });
    }

    // ========== ACQUISITION DATA STRUCTURE ==========
    const acquisitionMetrics = REPORT_METRICS.ga_acquisition.metrics;

    // ✅ Acquisition Current
    const acquisitionCurrent = {
        dateRange: `${options.dateRange.current.start} - ${options.dateRange.current.end}`,
        channels: allowedChannels,
        data: allowedChannels.map(channel => ({
            channel,
            sessions: currentAcquisition[channel].sessions,
            revenue: currentAcquisition[channel].revenue,
            bounce_rate: currentAcquisition[channel].bounce_rate,
            avg_engagement_time_per_session: currentAcquisition[channel].avg_engagement_time_per_session,
            conv_rate: currentAcquisition[channel].conv_rate,
            new_users: currentAcquisition[channel].new_users
        }))
    };

    // ✅ Acquisition Compared
    let acquisitionCompared = null;
    if (options.comparison && options.dateRange.compared) {  // ✅ Correct
        acquisitionCompared = {
            dateRange: `${options.dateRange.compared?.start} - ${options.dateRange.compared?.end}`,
            channels: allowedChannels,
            data: allowedChannels.map(channel => ({
                channel,
                sessions: comparedAcquisition[channel].sessions,
                revenue: comparedAcquisition[channel].revenue,
                bounce_rate: comparedAcquisition[channel].bounce_rate,
                avg_engagement_time_per_session: comparedAcquisition[channel].avg_engagement_time_per_session,
                conv_rate: comparedAcquisition[channel].conv_rate,
                new_users: comparedAcquisition[channel].new_users
            }))
        };
    }

    // ========== ACQUISITION TOTALS ==========
    const calculateAcquisitionTotals = (acqData: Record<string, any>) => {
        const totals: Record<string, number> = {
            sessions: 0, revenue: 0, orders: 0,
            engagedSessions: 0, newUsers: 0, averageSessionDuration: 0,
            bounce_rate: 0, avg_engagement_time_per_session: 0, conv_rate: 0, new_users: 0
        };

        allowedChannels.forEach(channel => {
            const d = acqData[channel];
            totals.sessions += d.sessions || 0;
            totals.revenue += d.revenue || 0;
            totals.orders += d.orders || 0;
            totals.engagedSessions += d.engagedSessions || 0;
            totals.newUsers += d.newUsers || 0;
            totals.averageSessionDuration += d.averageSessionDuration || 0;
        });

        totals.bounce_rate = totals.sessions > 0 ? ((totals.sessions - totals.engagedSessions) / totals.sessions) * 100 : 0;
        totals.avg_engagement_time_per_session = allowedChannels.length > 0 ? totals.averageSessionDuration / allowedChannels.length : 0;
        totals.conv_rate = totals.sessions > 0 ? (totals.orders / totals.sessions) * 100 : 0;
        totals.new_users = totals.newUsers;

        return totals;
    };

    const currentAcquisitionTotals = calculateAcquisitionTotals(currentAcquisition);
    const comparedAcquisitionTotals = options.comparison ? calculateAcquisitionTotals(comparedAcquisition) : null;

    // ✅ Acquisition Summary
    const acquisitionSummary: any = {
        current_totals: {
            sessions: currentAcquisitionTotals.sessions,
            revenue: currentAcquisitionTotals.revenue,
            bounce_rate: currentAcquisitionTotals.bounce_rate,
            avg_engagement_time_per_session: currentAcquisitionTotals.avg_engagement_time_per_session,
            conv_rate: currentAcquisitionTotals.conv_rate,
            new_users: currentAcquisitionTotals.new_users
        }
    };

    if (options.comparison && comparedAcquisitionTotals) {
        acquisitionSummary.compared_totals = {
            sessions: comparedAcquisitionTotals.sessions,
            revenue: comparedAcquisitionTotals.revenue,
            bounce_rate: comparedAcquisitionTotals.bounce_rate,
            avg_engagement_time_per_session: comparedAcquisitionTotals.avg_engagement_time_per_session,
            conv_rate: comparedAcquisitionTotals.conv_rate,
            new_users: comparedAcquisitionTotals.new_users
        };

        acquisitionSummary.changes = {};
        acquisitionMetrics.forEach(metric => {
            acquisitionSummary.changes[metric] = calculateChange(
                currentAcquisitionTotals[metric] || 0,
                comparedAcquisitionTotals[metric] || 0
            );
        });
    }

    // ========== FINAL RESPONSE ==========
    return {
        dateRange: options.dateRange,

        // Main GA Data
        main: {
            metrics,
            current: currentPeriod,
            compared: comparedPeriod,
            summary
        },

        // Acquisition Data
        acquisition: {
            metrics: acquisitionMetrics,
            current: acquisitionCurrent,
            compared: acquisitionCompared,
            summary: acquisitionSummary
        }
    };
}
async function fetchKlaviyoData(
    currentPayload: any[],
    comparedPayload: any[] = [],
    options: {
        comparison: boolean;
        dateRange: {
            current: { start: string; end: string };
            compared: { start: string; end: string } | null;
        }
    }
) {
    // ✅ NEW: Helper function for zero-filled Klaviyo data
    const getZeroFilledKlaviyoData = (dateRange: { start: string; end: string } | null) => {
        if (!dateRange) return {};
        const result: Record<string, Record<string, number>> = {};
        const labels = buildDimensionLabels(dateRange.start, dateRange.end, 'month');
        labels.forEach(dateKey => {
            result[dateKey] = {
                delivered: 0, bounced: 0, revenue: 0, recipients: 0,
                opens_unique: 0, clicks_unique: 0, no_of_items: 0,
                open_rate: 0, click_rate: 0
            };
        });
        return result;
    };

    // ========== SECTION BUILDER ==========
    const buildSectionData = (
        currentData: Record<string, Record<string, number>>,
        comparedData: Record<string, Record<string, number>>,
        type: "email" | "sms" | "flow"
    ) => {
        const metricNameMap: Record<string, string> = {
            email: "no_of_emails",
            sms: "no_of_sms",
            flow: "no_of_flows"
        };

        const currentDates = Object.keys(currentData).sort();
        const comparedDates = Object.keys(comparedData).sort();
        const cfg = REPORT_METRICS.klaviyo[type];
        const metrics = cfg.metrics;
        const countKey = cfg.countKey;

        // ✅ Current Period
        const currentPeriod = {
            dateRange: `${options.dateRange.current.start} - ${options.dateRange.current.end}`,
            labels: currentDates,
            data: currentDates.map(date => ({
                date,
                dateRange: getMonthDateRange(date, currentPayload),
                [countKey]: currentData[date]?.no_of_items || 0,
                revenue: currentData[date]?.revenue || 0,
                recipients: currentData[date]?.recipients || 0,
                open_rate: currentData[date]?.open_rate || 0,
                click_rate: currentData[date]?.click_rate || 0
            }))
        };

        // ✅ Compared Period
        let comparedPeriod = null;
        if (options.comparison && options.dateRange.compared) {
            comparedPeriod = {
                dateRange: `${options.dateRange.compared?.start} - ${options.dateRange.compared?.end}`,
                labels: comparedDates,
                data: comparedDates.map(date => ({
                    date,
                    dateRange: getMonthDateRange(date, comparedPayload),
                    [metricNameMap[type]]: comparedData[date]?.no_of_items || 0,
                    revenue: comparedData[date]?.revenue || 0,
                    recipients: comparedData[date]?.recipients || 0,
                    open_rate: comparedData[date]?.open_rate || 0,
                    click_rate: comparedData[date]?.click_rate || 0
                }))
            };
        }

        // ========== TOTALS CALCULATION ==========
        const calculateTotals = (aggregatedData: Record<string, Record<string, number>>) => {
            const totals: Record<string, number> = {
                delivered: 0, bounced: 0, revenue: 0, recipients: 0,
                opens_unique: 0, clicks_unique: 0, no_of_items: 0, open_rate: 0, click_rate: 0
            };

            Object.values(aggregatedData).forEach((d: any) => {
                totals.delivered += d.delivered || 0;
                totals.bounced += d.bounced || 0;
                totals.revenue += d.revenue || 0;
                totals.recipients += d.recipients || 0;
                totals.opens_unique += d.opens_unique || 0;
                totals.clicks_unique += d.clicks_unique || 0;
                totals.no_of_items += d.no_of_items || 0;
            });

            totals.open_rate = totals.delivered > 0 ? (totals.opens_unique / totals.delivered) * 100 : 0;
            totals.click_rate = totals.delivered > 0 ? (totals.clicks_unique / totals.delivered) * 100 : 0;

            return totals;
        };

        const currentTotals = calculateTotals(currentData);
        const comparedTotals = options.comparison ? calculateTotals(comparedData) : null;

        // ✅ Summary
        const summary: any = {
            current_totals: {
                [metricNameMap[type]]: currentTotals.no_of_items,
                revenue: currentTotals.revenue,
                recipients: currentTotals.recipients,
                open_rate: currentTotals.open_rate,
                click_rate: currentTotals.click_rate
            }
        };

        if (options.comparison && comparedTotals) {
            summary.compared_totals = {
                [metricNameMap[type]]: comparedTotals.no_of_items,
                revenue: comparedTotals.revenue,
                recipients: comparedTotals.recipients,
                open_rate: comparedTotals.open_rate,
                click_rate: comparedTotals.click_rate
            };

            summary.changes = {
                [metricNameMap[type]]: calculateChange(currentTotals.no_of_items, comparedTotals.no_of_items),
                revenue: calculateChange(currentTotals.revenue, comparedTotals.revenue),
                recipients: calculateChange(currentTotals.recipients, comparedTotals.recipients),
                open_rate: calculateChange(currentTotals.open_rate, comparedTotals.open_rate),
                click_rate: calculateChange(currentTotals.click_rate, comparedTotals.click_rate)
            };
        }

        return {
            metrics,
            current: currentPeriod,
            compared: comparedPeriod,
            summary
        };
    };

    // ========== AGGREGATE DATA ==========

    // ✅ Email current data with zero-fill
    let currentEmailData = aggregateKlaviyoData(currentPayload, 'month', 'email');
    if (Object.keys(currentEmailData).length === 0) {
        currentEmailData = getZeroFilledKlaviyoData(options.dateRange.current);
    }

    // ✅ SMS current data with zero-fill
    let currentSmsData = aggregateKlaviyoData(currentPayload, 'month', 'sms');
    if (Object.keys(currentSmsData).length === 0) {
        currentSmsData = getZeroFilledKlaviyoData(options.dateRange.current);
    }

    // ✅ Flow current data with zero-fill
    let currentFlowData = aggregateKlaviyoData(currentPayload, 'month', 'flow');
    if (Object.keys(currentFlowData).length === 0) {
        currentFlowData = getZeroFilledKlaviyoData(options.dateRange.current);
    }

    // ✅ Email compared data with zero-fill
    let comparedEmailData: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedEmailData = aggregateKlaviyoData(comparedPayload, 'month', 'email');
        if (Object.keys(comparedEmailData).length === 0) {
            comparedEmailData = getZeroFilledKlaviyoData(options.dateRange.compared);
        }
    }

    // ✅ SMS compared data with zero-fill
    let comparedSmsData: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedSmsData = aggregateKlaviyoData(comparedPayload, 'month', 'sms');
        if (Object.keys(comparedSmsData).length === 0) {
            comparedSmsData = getZeroFilledKlaviyoData(options.dateRange.compared);
        }
    }

    // ✅ Flow compared data with zero-fill
    let comparedFlowData: Record<string, Record<string, number>> = {};
    if (options.comparison) {
        comparedFlowData = aggregateKlaviyoData(comparedPayload, 'month', 'flow');
        if (Object.keys(comparedFlowData).length === 0) {
            comparedFlowData = getZeroFilledKlaviyoData(options.dateRange.compared);
        }
    }

    // ========== BUILD SECTIONS ==========
    const emailSection = buildSectionData(currentEmailData, comparedEmailData, 'email');
    const smsSection = buildSectionData(currentSmsData, comparedSmsData, 'sms');
    const flowSection = buildSectionData(currentFlowData, comparedFlowData, 'flow');

    // ========== OVERALL SUMMARY ==========
    const calculateOverallTotals = (emailData: any, smsData: any, flowData: any) => {
        return {
            total_revenue:
                (emailData.summary.current_totals.revenue || 0) +
                (smsData.summary.current_totals.revenue || 0) +
                (flowData.summary.current_totals.revenue || 0),
            email_revenue: emailData.summary.current_totals.revenue || 0,
            sms_revenue: smsData.summary.current_totals.revenue || 0,
            flow_revenue: flowData.summary.current_totals.revenue || 0,
            total_recipients:
                (emailData.summary.current_totals.recipients || 0) +
                (smsData.summary.current_totals.recipients || 0) +
                (flowData.summary.current_totals.recipients || 0)
        };
    };

    const currentOverallTotals = calculateOverallTotals(emailSection, smsSection, flowSection);

    let comparedOverallTotals = null;
    let overallChanges = null;

    if (options.comparison) {
        comparedOverallTotals = {
            total_revenue:
                (emailSection.summary.compared_totals?.revenue || 0) +
                (smsSection.summary.compared_totals?.revenue || 0) +
                (flowSection.summary.compared_totals?.revenue || 0),
            email_revenue: emailSection.summary.compared_totals?.revenue || 0,
            sms_revenue: smsSection.summary.compared_totals?.revenue || 0,
            flow_revenue: flowSection.summary.compared_totals?.revenue || 0,
            total_recipients:
                (emailSection.summary.compared_totals?.recipients || 0) +
                (smsSection.summary.compared_totals?.recipients || 0) +
                (flowSection.summary.compared_totals?.recipients || 0)
        };

        overallChanges = {
            total_revenue: calculateChange(currentOverallTotals.total_revenue, comparedOverallTotals.total_revenue),
            email_revenue: calculateChange(currentOverallTotals.email_revenue, comparedOverallTotals.email_revenue),
            sms_revenue: calculateChange(currentOverallTotals.sms_revenue, comparedOverallTotals.sms_revenue),
            flow_revenue: calculateChange(currentOverallTotals.flow_revenue, comparedOverallTotals.flow_revenue),
            total_recipients: calculateChange(currentOverallTotals.total_recipients, comparedOverallTotals.total_recipients)
        };
    }

    // ========== FINAL RESPONSE ==========
    return {
        dateRange: options.dateRange,

        // Individual Sections
        email: emailSection,
        sms: smsSection,
        flow: flowSection,

        // Overall Summary
        overall_summary: {
            current_totals: currentOverallTotals,
            compared_totals: comparedOverallTotals,
            changes: overallChanges
        }
    };
}