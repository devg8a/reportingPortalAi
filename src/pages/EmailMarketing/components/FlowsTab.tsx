import React, { useState, useMemo, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import CommonTable from "../../../common_components/CommonTable";
import { FlowRecord } from "../../../types/emailMarketing.types";
import { TableColumn, SortConfig } from "../../../common_components/tableTypes";

interface FlowsTabProps {
    flows: FlowRecord[];
    summary: {
        total_delivered: number;
        total_conversion_value: number;
        avg_open_rate: number;
        avg_click_rate: number;
        total_recipients: number;
        total_unsubscribes: number;
    } | null;
    loading: boolean;
}

const flowColumns: TableColumn[] = [
    {
        id: "flow_name",
        label: "Flow Name",
        width: "20%",
        sortable: true,
    },
    {
        id: "delivered",
        label: "Delivered",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "recipients",
        label: "Recipients",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "open_rate",
        label: "Open Rate",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "click_rate",
        label: "Click Rate",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "unique_opens",
        label: "Unique Opens",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "unique_clicks",
        label: "Unique Clicks",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "conversion_value",
        label: "Revenue",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "unsubscribes",
        label: "Unsubscribes",
        width: "10%",
        sortable: true,
        align: "right",
    },
];

const FlowsTab: React.FC<FlowsTabProps> = ({ flows, summary, loading }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const handleSortChange = useCallback(
        (columnId: string, direction: "asc" | "desc" | null) => {
            if (!columnId || !direction) {
                setSortConfig(null);
                return;
            }
            setSortConfig({ columnId, direction });
        },
        []
    );

    const sortedFlows = useMemo(() => {
        if (!sortConfig) return flows;
        const { columnId, direction } = sortConfig;
        return [...flows].sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[columnId];
            const bVal = (b as Record<string, unknown>)[columnId];
            if (typeof aVal === "number" && typeof bVal === "number") {
                return direction === "asc" ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal || "");
            const bStr = String(bVal || "");
            return direction === "asc"
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }, [flows, sortConfig]);

    const tableRows = useMemo(() => {
        return sortedFlows.map((f, idx) => ({
            id: `flow-${idx}`,
            ...f,
        }));
    }, [sortedFlows]);

    const renderCell = useCallback(
        (row: Record<string, unknown>, column: TableColumn) => {
            const val = row[column.id];
            switch (column.id) {
                case "flow_name":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 500,
                                color: "#111827",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "clamp(150px, 15vw, 300px)",
                            }}
                        >
                            {String(val || "")}
                        </Typography>
                    );
                case "open_rate":
                case "click_rate":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                color: "#111827",
                            }}
                        >
                            {Number(val || 0).toFixed(2)} %
                        </Typography>
                    );
                case "conversion_value":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                color: "#111827",
                            }}
                        >
                            ${" "}
                            {Number(val || 0).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Typography>
                    );
                default:
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                color: "#111827",
                            }}
                        >
                            {typeof val === "number"
                                ? val.toLocaleString("en-US")
                                : val !== null && val !== undefined
                                  ? String(val)
                                  : "-"}
                        </Typography>
                    );
            }
        },
        []
    );

    const renderSummaryRow = useCallback(
        (_rows: Record<string, unknown>[], column: TableColumn) => {
            if (!summary) return null;
            switch (column.id) {
                case "flow_name":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            Total
                        </Typography>
                    );
                case "delivered":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {summary.total_delivered.toLocaleString("en-US")}
                        </Typography>
                    );
                case "recipients":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {summary.total_recipients.toLocaleString("en-US")}
                        </Typography>
                    );
                case "open_rate":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {summary.avg_open_rate.toFixed(2)} %
                        </Typography>
                    );
                case "click_rate":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {summary.avg_click_rate.toFixed(2)} %
                        </Typography>
                    );
                case "conversion_value":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            ${" "}
                            {summary.total_conversion_value.toLocaleString(
                                "en-US",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                }
                            )}
                        </Typography>
                    );
                case "unsubscribes":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {summary.total_unsubscribes.toLocaleString(
                                "en-US"
                            )}
                        </Typography>
                    );
                default:
                    return null;
            }
        },
        [summary]
    );

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(12px, 1vw, 20px)",
            }}
        >
            <Box
                sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "clamp(6px, 0.5vw, 10px)",
                    backgroundColor: "#FFFFFF",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        padding: "clamp(10px, 0.8vw, 16px)",
                        borderBottom: "1px solid #E5E7EB",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "clamp(14px, 1vw, 18px)",
                            fontWeight: 600,
                            color: "#111827",
                        }}
                    >
                        Flows
                    </Typography>
                </Box>

                <CommonTable
                    columns={flowColumns}
                    rows={tableRows}
                    renderCell={renderCell}
                    sortConfig={sortConfig}
                    onSortChange={handleSortChange}
                    isLoading={loading}
                    enableSummaryRow={true}
                    renderSummaryRow={renderSummaryRow}
                    summaryRowPosition="bottom"
                    emptyMessage="No flows found for the selected date range"
                />
            </Box>
        </Box>
    );
};

export default FlowsTab;
