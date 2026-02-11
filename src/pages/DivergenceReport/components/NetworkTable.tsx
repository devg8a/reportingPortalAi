import React, { useState } from "react";
import { Box, Typography, IconButton, Collapse } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CommonTable from "../../../common_components/CommonTable";
import { TableColumn } from "../../../common_components/tableTypes";
import { DummyRow } from "../dummyData";

interface NetworkTableProps {
    title: string;
    icon?: string;
    rows: DummyRow[];
    summaryRow: DummyRow;
    columns: TableColumn[];
    metricKeys: string[];
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
                fontSize: "clamp(9px, 0.6vw, 11px)",
                fontWeight: 600,
                color: isPositive ? "#16a34a" : "#dc2626",
                bgcolor: isPositive ? "#dcfce7" : "#fee2e2",
                borderRadius: "9999px",
                px: "clamp(4px, 0.3vw, 8px)",
                py: "1px",
                whiteSpace: "nowrap",
            }}
        >
            {Math.abs(value)}%
            {isPositive ? (
                <TrendingUpIcon sx={{ fontSize: 12 }} />
            ) : (
                <TrendingDownIcon sx={{ fontSize: 12 }} />
            )}
        </Box>
    );
};

const NetworkTable: React.FC<NetworkTableProps> = ({
    title,
    icon,
    rows,
    summaryRow,
    columns,
}) => {
    const [open, setOpen] = useState(true);

    const renderCell = (row: DummyRow, column: TableColumn) => {
        const colId = column.id;

        if (colId === "period") {
            return (
                <Typography sx={{ fontSize: "clamp(11px, 0.75vw, 13px)", fontWeight: 500, color: "#374151" }}>
                    {row.period}
                </Typography>
            );
        }

        const curVal = row[colId] as number;
        const prevVal = row[`${colId}_prev`] as number;
        const change = pctChange(curVal, prevVal);
        const formatType = METRIC_FORMAT[colId] || "number";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(4px, 0.3vw, 6px)" }}>
                    <ChangeBadge value={change} />
                    <Typography component="span" sx={{ fontSize: "clamp(11px, 0.75vw, 13px)", fontWeight: 600, color: "#111827" }}>
                        {fmt(curVal, formatType)}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: "clamp(9px, 0.6vw, 11px)", color: "#9CA3AF", lineHeight: 1.2 }}>
                    {fmt(prevVal, formatType)}
                </Typography>
            </Box>
        );
    };

    const renderSummaryRow = (_rows: DummyRow[], column: TableColumn) => {
        const colId = column.id;

        if (colId === "period") {
            return (
                <Typography sx={{ fontSize: "clamp(11px, 0.75vw, 13px)", fontWeight: 700, color: "#EC4899" }}>
                    Summary
                </Typography>
            );
        }

        const curVal = summaryRow[colId] as number;
        const prevVal = summaryRow[`${colId}_prev`] as number;
        const change = pctChange(curVal, prevVal);
        const formatType = METRIC_FORMAT[colId] || "number";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(4px, 0.3vw, 6px)" }}>
                    <ChangeBadge value={change} />
                    <Typography component="span" sx={{ fontSize: "clamp(11px, 0.75vw, 13px)", fontWeight: 700, color: "#111827" }}>
                        {fmt(curVal, formatType)}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: "clamp(9px, 0.6vw, 11px)", color: "#9CA3AF", lineHeight: 1.2 }}>
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
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: "clamp(12px, 1vw, 20px)",
                    py: "clamp(8px, 0.6vw, 12px)",
                    borderBottom: open ? "1px solid #E5E7EB" : "none",
                    cursor: "pointer",
                }}
                onClick={() => setOpen(!open)}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(6px, 0.5vw, 10px)" }}>
                    <IconButton size="small" sx={{ p: 0 }}>
                        {open ? (
                            <KeyboardArrowUpIcon sx={{ fontSize: "clamp(16px, 1.2vw, 20px)" }} />
                        ) : (
                            <KeyboardArrowDownIcon sx={{ fontSize: "clamp(16px, 1.2vw, 20px)" }} />
                        )}
                    </IconButton>
                    {icon && (
                        <img
                            src={icon}
                            alt={title}
                            style={{ width: "clamp(16px, 1.2vw, 22px)", height: "clamp(16px, 1.2vw, 22px)", objectFit: "contain" }}
                        />
                    )}
                    <Typography sx={{ fontSize: "clamp(13px, 0.95vw, 16px)", fontWeight: 600, color: "#111827" }}>
                        {title}
                    </Typography>
                </Box>
            </Box>

            <Collapse in={open}>
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
            </Collapse>
        </Box>
    );
};

export default NetworkTable;
