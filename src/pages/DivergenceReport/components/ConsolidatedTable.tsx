import React from "react";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import { NetworkMetricRow } from "../../../types/divergenceReport.types";
import { formatCurrency, formatNumber, formatPercent, formatDecimal } from "./NetworkTable";

interface ConsolidatedTableProps {
    rows: NetworkMetricRow[];
    summary: NetworkMetricRow;
}

const ChangeIndicator: React.FC<{ value?: number }> = ({ value }) => {
    if (value === undefined || value === null || isNaN(value)) return null;

    const isPositive = value > 0;
    const isNeutral = value === 0;
    const color = isNeutral ? "#6B7280" : isPositive ? "#10B981" : "#EF4444";
    const bgColor = isNeutral ? "#F3F4F6" : isPositive ? "#ECFDF5" : "#FEF2F2";
    const arrow = isPositive ? "\u2191" : isNeutral ? "" : "\u2193";

    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "clamp(8px, 0.55vw, 10px)",
                fontWeight: 600,
                color,
                bgcolor: bgColor,
                borderRadius: "4px",
                px: "clamp(2px, 0.2vw, 4px)",
                py: "1px",
                ml: "clamp(2px, 0.15vw, 3px)",
                whiteSpace: "nowrap",
            }}
        >
            {arrow}{Math.abs(value).toFixed(1)}%
        </Box>
    );
};

const COLUMNS = [
    { key: "period", label: "Month", format: undefined },
    { key: "orders", label: "Orders", format: formatNumber },
    { key: "gross_sales", label: "Gross Sales", format: formatCurrency },
    { key: "discount", label: "Discount", format: formatCurrency },
    { key: "revenue", label: "Revenue", format: formatCurrency },
    { key: "sessions", label: "Sessions", format: formatNumber },
    { key: "conv_rate", label: "Conv. Rate (%)", format: formatPercent },
    { key: "aov", label: "AOV", format: formatCurrency },
    { key: "discount_pct", label: "Discount (%)", format: formatPercent },
    { key: "google_cost", label: "Google Cost", format: formatCurrency },
    { key: "meta_cost", label: "Meta Cost", format: formatCurrency },
    { key: "total_cost", label: "Total Cost", format: formatCurrency },
    { key: "meta_pct", label: "Meta (%)", format: formatPercent },
    { key: "cost_per_session", label: "Cost per session", format: formatCurrency },
    { key: "roas", label: "ROAS", format: formatDecimal },
];

const getCellValue = (row: NetworkMetricRow, key: string): number => {
    return (row as unknown as Record<string, number>)[key] ?? 0;
};

const getChangeValue = (row: NetworkMetricRow, key: string): number | undefined => {
    return (row as unknown as Record<string, number | undefined>)[`${key}_change`];
};

const ConsolidatedTable: React.FC<ConsolidatedTableProps> = ({ rows, summary }) => {
    return (
        <Box
            sx={{
                bgcolor: "#FFFFFF",
                borderRadius: "clamp(8px, 0.6vw, 12px)",
                border: "1px solid #E5E7EB",
                overflow: "hidden",
            }}
        >
            <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1200 }}>
                    <TableHead>
                        <TableRow
                            sx={{
                                bgcolor: "#F9FAFB",
                                "& th": {
                                    fontSize: "clamp(9px, 0.65vw, 11px)",
                                    fontWeight: 600,
                                    color: "#6B7280",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    py: "clamp(6px, 0.5vw, 10px)",
                                    px: "clamp(6px, 0.5vw, 10px)",
                                    borderBottom: "1px solid #E5E7EB",
                                    whiteSpace: "nowrap",
                                },
                            }}
                        >
                            {COLUMNS.map((col) => (
                                <TableCell key={col.key}>{col.label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, idx) => (
                            <TableRow
                                key={idx}
                                sx={{
                                    "&:hover": { bgcolor: "#F9FAFB" },
                                    "& td": {
                                        fontSize: "clamp(10px, 0.7vw, 12px)",
                                        fontWeight: 500,
                                        color: "#111827",
                                        py: "clamp(6px, 0.5vw, 10px)",
                                        px: "clamp(6px, 0.5vw, 10px)",
                                        borderBottom: "1px solid #F3F4F6",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                            >
                                {COLUMNS.map((col) => (
                                    <TableCell key={col.key}>
                                        {col.key === "period" ? (
                                            <Typography
                                                sx={{
                                                    fontSize: "clamp(10px, 0.7vw, 12px)",
                                                    fontWeight: 500,
                                                    color: "#374151",
                                                }}
                                            >
                                                {row.period}
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        fontSize: "clamp(10px, 0.7vw, 12px)",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {col.format
                                                        ? col.format(getCellValue(row, col.key))
                                                        : formatNumber(getCellValue(row, col.key))}
                                                </Typography>
                                                <ChangeIndicator value={getChangeValue(row, col.key)} />
                                            </Box>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}

                        <TableRow
                            sx={{
                                bgcolor: "#FDF2F8",
                                "& td": {
                                    fontSize: "clamp(10px, 0.7vw, 12px)",
                                    fontWeight: 700,
                                    color: "#111827",
                                    py: "clamp(8px, 0.6vw, 12px)",
                                    px: "clamp(6px, 0.5vw, 10px)",
                                    borderBottom: "none",
                                    whiteSpace: "nowrap",
                                },
                            }}
                        >
                            {COLUMNS.map((col) => (
                                <TableCell key={col.key}>
                                    {col.key === "period" ? (
                                        <Typography
                                            sx={{
                                                fontSize: "clamp(10px, 0.7vw, 12px)",
                                                fontWeight: 700,
                                                color: "#EC4899",
                                            }}
                                        >
                                            Total Summary
                                        </Typography>
                                    ) : (
                                        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                                            <Typography
                                                component="span"
                                                sx={{
                                                    fontSize: "clamp(10px, 0.7vw, 12px)",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {col.format
                                                    ? col.format(getCellValue(summary, col.key))
                                                    : formatNumber(getCellValue(summary, col.key))}
                                            </Typography>
                                            <ChangeIndicator value={getChangeValue(summary, col.key)} />
                                        </Box>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ConsolidatedTable;
