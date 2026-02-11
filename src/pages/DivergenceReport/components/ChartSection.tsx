import React, { useState } from "react";
import {
    Box,
    Typography,
    FormControl,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    SelectChangeEvent,
} from "@mui/material";
import AnalyticsLineChart, {
    SeriesItem,
} from "../../../common_components/AnalyticsLineChart/AnalyticsLineChart";
import { ChartSeriesData } from "../../../types/divergenceReport.types";

interface MetricOption {
    value: string;
    label: string;
}

interface ChartSectionProps {
    chartData: ChartSeriesData | null;
    connectedNetworks: string[];
    aggregation: "day" | "week" | "month";
    onAggregationChange: (value: "day" | "week" | "month") => void;
}

const METRIC_OPTIONS: MetricOption[] = [
    { value: "shopify_orders", label: "Shopify Orders" },
    { value: "shopify_gross_sales", label: "Shopify Gross Sales" },
    { value: "shopify_revenue", label: "Shopify Revenue" },
    { value: "shopify_sessions", label: "Shopify Sessions" },
    { value: "ga_sessions", label: "GA Sessions" },
    { value: "ga_revenue", label: "GA Revenue" },
    { value: "meta_spend", label: "Meta Spend" },
    { value: "meta_revenue", label: "Meta Revenue" },
    { value: "meta_roas", label: "Meta ROAS" },
    { value: "adword_spend", label: "Google Ads Spend" },
    { value: "adword_revenue", label: "Google Ads Revenue" },
    { value: "adword_roas", label: "Google Ads ROAS" },
    { value: "total_revenue", label: "Total Revenue" },
    { value: "total_spend", label: "Total Spend" },
];

const METRIC_COLORS: Record<string, string> = {
    shopify_orders: "#EC4899",
    shopify_gross_sales: "#F97316",
    shopify_revenue: "#3B82F6",
    shopify_sessions: "#8B5CF6",
    ga_sessions: "#8B5CF6",
    ga_revenue: "#3B82F6",
    meta_spend: "#10B981",
    meta_revenue: "#EC4899",
    meta_roas: "#6366F1",
    adword_spend: "#10B981",
    adword_revenue: "#EC4899",
    adword_roas: "#6366F1",
    total_revenue: "#EC4899",
    total_spend: "#10B981",
};

const CURRENCY_METRICS = [
    "shopify_gross_sales",
    "shopify_revenue",
    "ga_revenue",
    "meta_spend",
    "meta_revenue",
    "adword_spend",
    "adword_revenue",
    "total_revenue",
    "total_spend",
];

const ChartSection: React.FC<ChartSectionProps> = ({
    chartData,
    connectedNetworks,
    aggregation,
    onAggregationChange,
}) => {
    const [metric1, setMetric1] = useState("shopify_orders");
    const [metric2, setMetric2] = useState("shopify_gross_sales");
    const [showCompare, setShowCompare] = useState(false);

    const availableMetrics = METRIC_OPTIONS.filter((opt) => {
        const prefix = opt.value.split("_")[0];
        if (prefix === "total") return true;
        return connectedNetworks.some(
            (n) => n.toLowerCase() === prefix || (prefix === "adword" && n.toLowerCase() === "google_ads")
        );
    });

    const buildSeries = (): SeriesItem[] => {
        const series: SeriesItem[] = [];
        if (!chartData?.series) return series;

        const data1 = chartData.series[metric1] || [];
        const data2 = chartData.series[metric2] || [];

        const m1Label =
            METRIC_OPTIONS.find((o) => o.value === metric1)?.label || metric1;
        const m2Label =
            METRIC_OPTIONS.find((o) => o.value === metric2)?.label || metric2;

        const isCurrency1 = CURRENCY_METRICS.includes(metric1);

        series.push({
            name: m1Label,
            data: data1,
            color: METRIC_COLORS[metric1] || "#EC4899",
            yAxisIndex: isCurrency1 ? 0 : 1,
        });

        series.push({
            name: m2Label,
            data: data2,
            color: METRIC_COLORS[metric2] || "#F97316",
            yAxisIndex: CURRENCY_METRICS.includes(metric2) ? 0 : 1,
        });

        return series;
    };

    return (
        <Box
            sx={{
                bgcolor: "#FFFFFF",
                borderRadius: "clamp(8px, 0.6vw, 12px)",
                border: "1px solid #E5E7EB",
                p: "clamp(12px, 1.2vw, 24px)",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "clamp(8px, 0.6vw, 12px)",
                    mb: "clamp(12px, 1vw, 20px)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(6px, 0.5vw, 10px)",
                        flexWrap: "wrap",
                    }}
                >
                    <FormControl size="small" sx={{ minWidth: "clamp(120px, 10vw, 180px)" }}>
                        <Select
                            value={metric1}
                            onChange={(e: SelectChangeEvent) => setMetric1(e.target.value)}
                            sx={{
                                fontSize: "clamp(11px, 0.8vw, 13px)",
                                fontWeight: 500,
                                borderRadius: "clamp(4px, 0.3vw, 8px)",
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "#E5E7EB",
                                },
                            }}
                        >
                            {availableMetrics.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "13px" }}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Typography sx={{ fontSize: "clamp(11px, 0.8vw, 13px)", color: "#9CA3AF" }}>
                        vs
                    </Typography>

                    <FormControl size="small" sx={{ minWidth: "clamp(120px, 10vw, 180px)" }}>
                        <Select
                            value={metric2}
                            onChange={(e: SelectChangeEvent) => setMetric2(e.target.value)}
                            sx={{
                                fontSize: "clamp(11px, 0.8vw, 13px)",
                                fontWeight: 500,
                                borderRadius: "clamp(4px, 0.3vw, 8px)",
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "#E5E7EB",
                                },
                            }}
                        >
                            {availableMetrics.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "13px" }}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: "clamp(80px, 6vw, 120px)" }}>
                        <Select
                            value={aggregation}
                            onChange={(e: SelectChangeEvent) =>
                                onAggregationChange(e.target.value as "day" | "week" | "month")
                            }
                            sx={{
                                fontSize: "clamp(11px, 0.8vw, 13px)",
                                fontWeight: 500,
                                borderRadius: "clamp(4px, 0.3vw, 8px)",
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "#E5E7EB",
                                },
                            }}
                        >
                            <MenuItem value="day" sx={{ fontSize: "13px" }}>Day</MenuItem>
                            <MenuItem value="week" sx={{ fontSize: "13px" }}>Week</MenuItem>
                            <MenuItem value="month" sx={{ fontSize: "13px" }}>Month</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showCompare}
                            onChange={(e) => setShowCompare(e.target.checked)}
                            size="small"
                            sx={{
                                color: "#D1D5DB",
                                "&.Mui-checked": { color: "#EC4899" },
                            }}
                        />
                    }
                    label={
                        <Typography sx={{ fontSize: "clamp(11px, 0.8vw, 13px)", color: "#6B7280" }}>
                            Compare with prior periods
                        </Typography>
                    }
                />
            </Box>

            <AnalyticsLineChart
                categories={chartData?.labels || []}
                series={buildSeries()}
                showLegend={true}
                height={350}
            />
        </Box>
    );
};

export default ChartSection;
