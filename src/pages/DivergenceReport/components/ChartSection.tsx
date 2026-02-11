import React, { useState } from "react";
import {
    Box,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
} from "@mui/material";
import AnalyticsLineChart, {
    SeriesItem,
} from "../../../common_components/AnalyticsLineChart/AnalyticsLineChart";
import {
    CHART_CATEGORIES,
    CHART_COMPARISON_LABELS,
    CHART_SERIES_DATA,
    CHART_COMPARISON_DATA,
} from "../dummyData";

interface ChartSectionProps {
    aggregation: "day" | "week" | "month";
    onAggregationChange: (value: "day" | "week" | "month") => void;
}

const METRIC_OPTIONS = [
    { value: "Revenue", label: "Shopify Revenue", dataKey: "revenue" as const },
    { value: "Shopify Revenue", label: "Shopify Gross Sales", dataKey: "shopify_revenue" as const },
    { value: "Spend", label: "Spend", dataKey: "spend" as const },
    { value: "ROAS", label: "ROAS", dataKey: "roas" as const },
    { value: "Sessions", label: "Sessions", dataKey: "sessions" as const },
    { value: "Clicks", label: "Clicks", dataKey: "clicks" as const },
    { value: "CPC", label: "CPC", dataKey: "cpc" as const },
];

type DataKey = keyof typeof CHART_SERIES_DATA;

const ChartSection: React.FC<ChartSectionProps> = ({
    aggregation,
    onAggregationChange,
}) => {
    const [metric1, setMetric1] = useState("Revenue");
    const [metric2, setMetric2] = useState("Shopify Revenue");

    const buildSeries = (): SeriesItem[] => {
        const m1 = METRIC_OPTIONS.find((o) => o.value === metric1);
        const m2 = METRIC_OPTIONS.find((o) => o.value === metric2);
        const series: SeriesItem[] = [];

        if (m1) {
            series.push({
                name: m1.value,
                data: CHART_SERIES_DATA[m1.dataKey as DataKey] || [],
                yAxisIndex: ["roas", "cpc"].includes(m1.dataKey) ? 1 : 0,
            });
        }

        if (m2) {
            series.push({
                name: m2.value,
                data: CHART_SERIES_DATA[m2.dataKey as DataKey] || [],
                yAxisIndex: ["roas", "cpc"].includes(m2.dataKey) ? 1 : 0,
            });
        }

        return series;
    };

    const buildComparison = () => ({
        labels: CHART_COMPARISON_LABELS,
        series: CHART_COMPARISON_DATA,
    });

    const selectSx = {
        fontSize: "clamp(11px, 0.8vw, 13px)",
        fontWeight: 500,
        borderRadius: "clamp(4px, 0.3vw, 8px)",
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E5E7EB" },
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
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(6px, 0.5vw, 10px)", flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: "clamp(120px, 10vw, 180px)" }}>
                        <Select value={metric1} onChange={(e: SelectChangeEvent) => setMetric1(e.target.value)} sx={selectSx}>
                            {METRIC_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "13px" }}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ fontSize: "clamp(11px, 0.8vw, 13px)", color: "#9CA3AF" }}>vs</Box>

                    <FormControl size="small" sx={{ minWidth: "clamp(120px, 10vw, 180px)" }}>
                        <Select value={metric2} onChange={(e: SelectChangeEvent) => setMetric2(e.target.value)} sx={selectSx}>
                            {METRIC_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "13px" }}>{opt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: "clamp(80px, 6vw, 120px)" }}>
                        <Select
                            value={aggregation}
                            onChange={(e: SelectChangeEvent) => onAggregationChange(e.target.value as "day" | "week" | "month")}
                            sx={selectSx}
                        >
                            <MenuItem value="day" sx={{ fontSize: "13px" }}>Day</MenuItem>
                            <MenuItem value="week" sx={{ fontSize: "13px" }}>Week</MenuItem>
                            <MenuItem value="month" sx={{ fontSize: "13px" }}>Month</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <AnalyticsLineChart
                categories={CHART_CATEGORIES}
                series={buildSeries()}
                comparison={buildComparison()}
                showLegend={true}
                height={350}
            />
        </Box>
    );
};

export default ChartSection;
