import { Box, Typography } from "@mui/material";
import React, { useMemo } from "react";
import StatCard from "./StatCard";
import { PerformanceReportResponse, GetPerformanceEntitiesResponse } from "../../../types/accountSummary.types";
import AnalyticsLineChart from "../../../common_components/AnalyticsLineChart/AnalyticsLineChart";

interface SportPerformanceProps {
    data: PerformanceReportResponse["data"] | null;
    entities: GetPerformanceEntitiesResponse["data"] | null;
    loading: boolean;
    activeTab: string;
    overallData?: PerformanceReportResponse["data"] | null;
    clientId?: string;
}

const SportPerformance: React.FC<SportPerformanceProps> = ({
    data,
    entities,
    loading,
    activeTab,
    overallData,
    clientId
}) => {


    if (!data) {
        return (
            <Box sx={{ p: 4, textAlign: "center", color: "#64748b" }}>
                <Typography>No Data Available</Typography>
            </Box>
        );
    }

    const tabKey = activeTab.toLowerCase() === 'meta'
        ? 'meta'
        : activeTab.toLowerCase() === 'adword'
            ? 'adword'
            : 'all';

    let chartData: any = null;
    let statsContainer: any = null;

    if (tabKey === 'meta') {
        chartData = data.charts?.meta;
        statsContainer = data.charts?.meta?.stats;
    } else if (tabKey === 'adword') {
        chartData = data.charts?.adword;
        statsContainer = data.charts?.adword?.stats;
    } else {
        chartData = data.charts?.all;
        statsContainer = data.charts?.all?.stats;
    }

    if (!statsContainer) return null;

    const current = statsContainer.current;
    const comparison = statsContainer.comparison;
    const hasComparison = !!comparison;
    const base = hasComparison ? (comparison || statsContainer.base) : null;
    const isAllTab = tabKey === 'all';

    // ✅ Build chart series based on tab
    const { chartSeries, comparisonData } = useMemo(() => {
        const series: any[] = [];

        if (!chartData?.series) {
            return { chartSeries: [], comparisonData: undefined };
        }

        // ============ ALL TAB - Only these 5 metrics ============
        if (isAllTab) {
            // Channel Revenue
            if (chartData.series.revenue || chartData.series.channel_revenue) {
                series.push({
                    name: "Channel Revenue",
                    data: chartData.series.revenue || chartData.series.channel_revenue,
                    color: "#EC4899"
                });
            }

            // Shopify Revenue
            if (chartData.series.shopify_revenue) {
                series.push({
                    name: "Shopify Revenue",
                    data: chartData.series.shopify_revenue,
                    color: "#3B82F6"
                });
            }

            // Spend
            if (chartData.series.spend) {
                series.push({
                    name: "Spend",
                    data: chartData.series.spend,
                    color: "#10B981"
                });
            }

            // ROAS (Channel)
            if (chartData.series.roas || chartData.series.roas_channel) {
                series.push({
                    name: "ROAS (Channel)",
                    data: chartData.series.roas || chartData.series.roas_channel,
                    color: "#6366f1",
                    yAxisIndex: 1
                });
            }

            // ROAS (Shopify)
            if (chartData.series.roas_shopify) {
                series.push({
                    name: "ROAS (Shopify)",
                    data: chartData.series.roas_shopify,
                    color: "#8B5CF6",
                    yAxisIndex: 1
                });
            }
        }

        // ============ META TAB ============
        if (tabKey === 'meta') {
            // Channel Revenue
            if (chartData.series.revenue || chartData.series.channel_revenue) {
                series.push({
                    name: "Channel Revenue",
                    data: chartData.series.revenue || chartData.series.channel_revenue,
                    color: "#EC4899"
                });
            }

            // Spend
            if (chartData.series.spend) {
                series.push({
                    name: "Spend",
                    data: chartData.series.spend,
                    color: "#10B981"
                });
            }

            // ROAS
            if (chartData.series.roas) {
                series.push({
                    name: "ROAS",
                    data: chartData.series.roas,
                    color: "#6366f1",
                    yAxisIndex: 1
                });
            }

            // Outbound Clicks
            if (chartData.series.outbound_clicks) {
                series.push({
                    name: "Outbound Clicks",
                    data: chartData.series.outbound_clicks,
                    color: "#14b8a6"
                });
            }
        }

        // ============ ADWORD TAB ============
        if (tabKey === 'adword') {
            // Channel Revenue
            if (chartData.series.revenue || chartData.series.channel_revenue) {
                series.push({
                    name: "Channel Revenue",
                    data: chartData.series.revenue || chartData.series.channel_revenue,
                    color: "#EC4899"
                });
            }

            // Spend
            if (chartData.series.spend) {
                series.push({
                    name: "Spend",
                    data: chartData.series.spend,
                    color: "#10B981"
                });
            }

            // ROAS
            if (chartData.series.roas) {
                series.push({
                    name: "ROAS",
                    data: chartData.series.roas,
                    color: "#6366f1",
                    yAxisIndex: 1
                });
            }

            // Clicks
            if (chartData.series.clicks) {
                series.push({
                    name: "Clicks",
                    data: chartData.series.clicks,
                    color: "#0ea5e9"
                });
            }
        }

        // ============ BUILD COMPARISON DATA ============
        let compData = undefined;

        if (chartData?.comparison_labels && chartData?.comparison_series) {
            if (isAllTab) {
                compData = {
                    labels: chartData.comparison_labels,
                    series: {
                        channel_revenue: chartData.comparison_series.revenue || chartData.comparison_series.channel_revenue,
                        shopify_revenue: chartData.comparison_series.shopify_revenue,
                        spend: chartData.comparison_series.spend,
                        roas_channel: chartData.comparison_series.roas || chartData.comparison_series.roas_channel,
                        roas_shopify: chartData.comparison_series.roas_shopify,
                        cpc: chartData.comparison_series.cpc,
                        sessions: chartData.comparison_series.sessions,
                    },
                };
            } else if (tabKey === 'meta') {
                compData = {
                    labels: chartData.comparison_labels,
                    series: {
                        channel_revenue: chartData.comparison_series.revenue || chartData.comparison_series.channel_revenue,
                        spend: chartData.comparison_series.spend,
                        roas: chartData.comparison_series.roas,
                        cpc: chartData.comparison_series.cpc,
                        outbound_clicks: chartData.comparison_series.outbound_clicks,
                    },
                };
            } else if (tabKey === 'adword') {
                compData = {
                    labels: chartData.comparison_labels,
                    series: {
                        channel_revenue: chartData.comparison_series.revenue || chartData.comparison_series.channel_revenue,
                        spend: chartData.comparison_series.spend,
                        roas: chartData.comparison_series.roas,
                        cpc: chartData.comparison_series.cpc,
                        clicks: chartData.comparison_series.clicks,
                    },
                };
            }
        }

        return { chartSeries: series, comparisonData: compData };
    }, [chartData, tabKey, isAllTab]);

    return (
        <Box sx={{ p: 2 }}>
            {/* Stats Cards */}
            <Box
                sx={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                    gap: 2,
                    alignItems: "stretch",
                    mb: 1
                }}
            >
                <StatCard
                    title="Channel Revenue"
                    value={current.revenue ?? current.channel_revenue ?? 0}
                    previous={hasComparison ? (base?.revenue ?? base?.channel_revenue) : undefined}
                    comparisonActive={hasComparison}
                    formatType="revenue"
                />

                {isAllTab && (
                    <StatCard
                        title="Shopify Revenue"
                        value={current.shopify_revenue ?? 0}
                        previous={hasComparison ? base?.shopify_revenue : undefined}
                        comparisonActive={hasComparison}
                        formatType="revenue"
                    />
                )}

                <StatCard
                    title="Spend"
                    value={current.spend ?? 0}
                    previous={hasComparison ? base?.spend : undefined}
                    isInverse
                    comparisonActive={hasComparison}
                />

                <StatCard
                    title="ROAS (Channel)"
                    value={current.roas ?? current.roas_channel ?? 0}
                    previous={hasComparison ? (base?.roas ?? base?.roas_channel) : undefined}
                    comparisonActive={hasComparison}
                    formatType="roas"
                />

                {isAllTab && (
                    <StatCard
                        title="ROAS (Shopify)"
                        value={current.roas_shopify ?? 0}
                        previous={hasComparison ? base?.roas_shopify : undefined}
                        comparisonActive={hasComparison}
                        formatType="roas"
                    />
                )}

                {/* Meta Only */}
                {tabKey === 'meta' && (
                    <>
                        <StatCard
                            title="ROAS CT"
                            value={current.roas_ct ?? 0}
                            previous={hasComparison ? base?.roas_ct : undefined}
                            comparisonActive={hasComparison}
                            formatType="roas"
                        />
                        <StatCard
                            title="ROAS VT"
                            value={current.roas_vt ?? 0}
                            previous={hasComparison ? base?.roas_vt : undefined}
                            comparisonActive={hasComparison}
                            formatType="roas"
                        />
                        <StatCard
                            title="Outbound Clicks"
                            value={current.outbound_clicks ?? 0}
                            previous={hasComparison ? base?.outbound_clicks : undefined}
                            comparisonActive={hasComparison}
                            formatType="number"
                        />
                    </>
                )}

                {/* Adword Only */}
                {tabKey === 'adword' && current.clicks != null && (
                    <StatCard
                        title="Clicks"
                        value={current.clicks ?? 0}
                        previous={hasComparison ? base?.clicks : undefined}
                        comparisonActive={hasComparison}
                        formatType="number"
                    />
                )}

                {current.percent_of_spend != null && (
                    <StatCard
                        title="% of Spend"
                        value={current.percent_of_spend}
                        previous={hasComparison ? base?.percent_of_spend : undefined}
                        comparisonActive={hasComparison}
                        formatType="percent_of_spend"
                    />
                )}

                {current.percent_of_sale != null && (
                    <StatCard
                        title="% of Sale"
                        value={current.percent_of_sale}
                        previous={hasComparison ? base?.percent_of_sale : undefined}
                        comparisonActive={hasComparison}
                        formatType="percent_of_sale"
                    />
                )}
            </Box>

            {/* Performance Chart */}
            <Box sx={{ mt: 4 }}>
                <AnalyticsLineChart
                    categories={chartData?.labels}
                    series={chartSeries}
                    height={350}
                    showLegend={true}
                    comparison={comparisonData}

                />
            </Box>
        </Box>
    );
};

export default SportPerformance;