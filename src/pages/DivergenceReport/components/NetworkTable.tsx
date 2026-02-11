import React, { useState } from "react";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Collapse,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { NetworkMetricRow } from "../../../types/divergenceReport.types";

interface ColumnDef {
    key: string;
    label: string;
    format?: (value: number) => string;
    width?: string;
}

interface NetworkTableProps {
    title: string;
    icon?: string;
    rows: NetworkMetricRow[];
    summary: NetworkMetricRow;
    columns: ColumnDef[];
}

const formatCurrency = (v: number): string =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatNumber = (v: number): string =>
    v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatPercent = (v: number): string =>
    `${v.toFixed(2)}%`;

const formatDecimal = (v: number): string =>
    v.toFixed(2);

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
                fontSize: "clamp(9px, 0.6vw, 11px)",
                fontWeight: 600,
                color,
                bgcolor: bgColor,
                borderRadius: "4px",
                px: "clamp(3px, 0.3vw, 6px)",
                py: "1px",
                ml: "clamp(2px, 0.2vw, 4px)",
                whiteSpace: "nowrap",
            }}
        >
            {arrow}{Math.abs(value).toFixed(1)}%
        </Box>
    );
};

const getCellValue = (row: NetworkMetricRow, key: string): number => {
    return (row as unknown as Record<string, number>)[key] ?? 0;
};

const getChangeValue = (row: NetworkMetricRow, key: string): number | undefined => {
    return (row as unknown as Record<string, number | undefined>)[`${key}_change`];
};

const NetworkTable: React.FC<NetworkTableProps> = ({
    title,
    icon,
    rows,
    summary,
    columns,
}) => {
    const [open, setOpen] = useState(true);

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
                            style={{
                                width: "clamp(16px, 1.2vw, 22px)",
                                height: "clamp(16px, 1.2vw, 22px)",
                                objectFit: "contain",
                            }}
                        />
                    )}
                    <Typography
                        sx={{
                            fontSize: "clamp(13px, 0.95vw, 16px)",
                            fontWeight: 600,
                            color: "#111827",
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
            </Box>

            <Collapse in={open}>
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 700 }}>
                        <TableHead>
                            <TableRow
                                sx={{
                                    bgcolor: "#F9FAFB",
                                    "& th": {
                                        fontSize: "clamp(10px, 0.7vw, 12px)",
                                        fontWeight: 600,
                                        color: "#6B7280",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        py: "clamp(6px, 0.5vw, 10px)",
                                        px: "clamp(8px, 0.6vw, 12px)",
                                        borderBottom: "1px solid #E5E7EB",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                            >
                                {columns.map((col) => (
                                    <TableCell key={col.key} sx={{ width: col.width }}>
                                        {col.label}
                                    </TableCell>
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
                                            fontSize: "clamp(11px, 0.75vw, 13px)",
                                            fontWeight: 500,
                                            color: "#111827",
                                            py: "clamp(6px, 0.5vw, 10px)",
                                            px: "clamp(8px, 0.6vw, 12px)",
                                            borderBottom: "1px solid #F3F4F6",
                                            whiteSpace: "nowrap",
                                        },
                                    }}
                                >
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>
                                            {col.key === "period" ? (
                                                <Typography
                                                    sx={{
                                                        fontSize: "clamp(11px, 0.75vw, 13px)",
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
                                                            fontSize: "clamp(11px, 0.75vw, 13px)",
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
                                        fontSize: "clamp(11px, 0.75vw, 13px)",
                                        fontWeight: 700,
                                        color: "#111827",
                                        py: "clamp(8px, 0.6vw, 12px)",
                                        px: "clamp(8px, 0.6vw, 12px)",
                                        borderBottom: "none",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                            >
                                {columns.map((col) => (
                                    <TableCell key={col.key}>
                                        {col.key === "period" ? (
                                            <Typography
                                                sx={{
                                                    fontSize: "clamp(11px, 0.75vw, 13px)",
                                                    fontWeight: 700,
                                                    color: "#EC4899",
                                                }}
                                            >
                                                Summary
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        fontSize: "clamp(11px, 0.75vw, 13px)",
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
            </Collapse>
        </Box>
    );
};

export { formatCurrency, formatNumber, formatPercent, formatDecimal };
export default NetworkTable;
