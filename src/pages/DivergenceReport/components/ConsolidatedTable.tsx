import React from "react";
import { Box, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CommonTable from "../../../common_components/CommonTable";
import { TableColumn } from "../../../common_components/tableTypes";
import { DummyRow } from "../dummyData";

interface ConsolidatedTableProps {
    rows: DummyRow[];
    summaryRow: DummyRow;
    columns: TableColumn[];
}

const fmt = (v: number, type: string): string => {
    if (type === "currency")
        return `$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (type === "percent") return `${v.toFixed(2)} %`;
    if (type === "decimal") return v.toFixed(2);
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const METRIC_FORMAT: Record<string, string> = {
    orders: "number",
    gross_sales: "currency",
    discount: "currency",
    revenue: "currency",
    sessions: "number",
    conv_rate: "percent",
    aov: "currency",
    discount_pct: "percent",
    spend: "currency",
    clicks: "number",
    cpc: "currency",
    impressions: "number",
    ctr: "percent",
    roas: "decimal",
    delivered: "number",
    open_rate: "percent",
    click_rate: "percent",
    unsubscribes: "number",
    recipients: "number",
    conversion_value: "currency",
    google_cost: "currency",
    meta_cost: "currency",
    total_cost: "currency",
};

const pctChange = (cur: number, prev: number): number => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / Math.abs(prev)) * 100);
};

const ChangeBadge: React.FC<{ value: number }> = ({ value }) => {
    const isPositive = value >= 0;
    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "clamp(8px, 0.55vw, 10px)",
                fontWeight: 600,
                color: isPositive ? "#16a34a" : "#dc2626",
                bgcolor: isPositive ? "#dcfce7" : "#fee2e2",
                borderRadius: "9999px",
                px: "clamp(3px, 0.25vw, 6px)",
                py: "1px",
                whiteSpace: "nowrap",
            }}
        >
            {Math.abs(value)}%
            {isPositive ? (
                <TrendingUpIcon sx={{ fontSize: 10 }} />
            ) : (
                <TrendingDownIcon sx={{ fontSize: 10 }} />
            )}
        </Box>
    );
};

const ConsolidatedTable: React.FC<ConsolidatedTableProps> = ({ rows, summaryRow, columns }) => {
    const renderCell = (row: DummyRow, column: TableColumn) => {
        const colId = column.id;

        if (colId === "period") {
            return (
                <Typography sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", fontWeight: 500, color: "#374151" }}>
                    {row.period}
                </Typography>
            );
        }

        const curVal = row[colId] as number;
        const prevVal = row[`${colId}_prev`] as number;
        const change = pctChange(curVal, prevVal);
        const formatType = METRIC_FORMAT[colId] || "number";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(3px, 0.2vw, 5px)" }}>
                    <ChangeBadge value={change} />
                    <Typography component="span" sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", fontWeight: 600, color: "#111827" }}>
                        {fmt(curVal, formatType)}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: "clamp(8px, 0.55vw, 10px)", color: "#9CA3AF", lineHeight: 1.2 }}>
                    {fmt(prevVal, formatType)}
                </Typography>
            </Box>
        );
    };

    const renderSummaryRow = (_rows: DummyRow[], column: TableColumn) => {
        const colId = column.id;

        if (colId === "period") {
            return (
                <Typography sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", fontWeight: 700, color: "#EC4899" }}>
                    Total Summary
                </Typography>
            );
        }

        const curVal = summaryRow[colId] as number;
        const prevVal = summaryRow[`${colId}_prev`] as number;
        const change = pctChange(curVal, prevVal);
        const formatType = METRIC_FORMAT[colId] || "number";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(3px, 0.2vw, 5px)" }}>
                    <ChangeBadge value={change} />
                    <Typography component="span" sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", fontWeight: 700, color: "#111827" }}>
                        {fmt(curVal, formatType)}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: "clamp(8px, 0.55vw, 10px)", color: "#9CA3AF", lineHeight: 1.2 }}>
                    {fmt(prevVal, formatType)}
                </Typography>
            </Box>
        );
    };

    return (
        <Box
            sx={{
                bgcolor: "#FFFFFF",
                borderRadius: "clamp(8px, 0.6vw, 12px)",
                border: "1px solid #E5E7EB",
                overflow: "hidden",
            }}
        >
            <CommonTable
                columns={columns}
                rows={rows}
                renderCell={renderCell}
                enableSummaryRow={true}
                renderSummaryRow={renderSummaryRow}
                summaryRowPosition="bottom"
                isLoading={false}
                isFirstLoad={false}
                emptyMessage="No data available"
            />
        </Box>
    );
};

export default ConsolidatedTable;
