import React, { useState, useMemo, useCallback } from "react";
import { Box, Typography, Switch, FormControlLabel } from "@mui/material";
import BenchmarkCard from "./BenchmarkCard";
import CampaignMetricCard from "./CampaignMetricCard";
import CommonTable from "../../../common_components/CommonTable";
import {
    BenchmarkPeriod,
    CampaignMetrics,
    CampaignRecord,
} from "../../../types/emailMarketing.types";
import { TableColumn, SortConfig } from "../../../common_components/tableTypes";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

interface CampaignsTabProps {
    benchmarks: {
        twoMonths: BenchmarkPeriod;
        sixMonths: BenchmarkPeriod;
        twelveMonths: BenchmarkPeriod;
    } | null;
    metrics: CampaignMetrics | null;
    previousMetrics?: CampaignMetrics | null;
    campaigns: CampaignRecord[];
    loading: boolean;
    showComparison: boolean;
}

const defaultBenchmark: BenchmarkPeriod = {
    total_delivered: 0,
    total_opens_unique: 0,
    total_clicks_unique: 0,
    avg_delivered: 0,
    avg_unique_open_email: 0,
    avg_unique_clicks: 0,
    open_rate: 0,
    click_rate: 0,
};

const campaignColumns: TableColumn[] = [
    {
        id: "campaign_name",
        label: "Campaign Name",
        width: "25%",
        sortable: true,
    },
    {
        id: "preview",
        label: "Preview",
        width: "5%",
        sortable: false,
        align: "center",
    },
    {
        id: "send_weekday",
        label: "Send Weekday",
        width: "10%",
        sortable: true,
    },
    {
        id: "total_recipients",
        label: "Total Recipients",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "unique_placed_order",
        label: "Unique Placed Order",
        width: "10%",
        sortable: true,
        align: "right",
    },
    {
        id: "place_order_rate",
        label: "Place Order Rate",
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
        id: "open_rate",
        label: "Open Rate",
        width: "10%",
        sortable: true,
        align: "right",
    },
];

const CampaignsTab: React.FC<CampaignsTabProps> = ({
    benchmarks,
    metrics,
    previousMetrics,
    campaigns,
    loading,
    showComparison,
}) => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [showCompareData, setShowCompareData] = useState(false);

    const bm = benchmarks || {
        twoMonths: defaultBenchmark,
        sixMonths: defaultBenchmark,
        twelveMonths: defaultBenchmark,
    };

    const m = metrics || {
        open_rate: 0,
        total_recipients: 0,
        click_rate: 0,
        num_emails: 0,
        num_unsubscribers: 0,
        promo_recipients: 0,
        non_promo_recipients: 0,
    };

    const pm = previousMetrics || m;

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

    const sortedCampaigns = useMemo(() => {
        if (!sortConfig) return campaigns;
        const { columnId, direction } = sortConfig;
        return [...campaigns].sort((a, b) => {
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
    }, [campaigns, sortConfig]);

    const tableRows = useMemo(() => {
        return sortedCampaigns.map((c, idx) => ({
            id: `campaign-${idx}`,
            ...c,
        }));
    }, [sortedCampaigns]);

    const totals = useMemo(() => {
        return campaigns.reduce(
            (acc, c) => ({
                total_recipients:
                    acc.total_recipients + (c.total_recipients || 0),
                unique_placed_order:
                    acc.unique_placed_order + (c.unique_placed_order || 0),
                place_order_rate: 0,
                unique_opens: acc.unique_opens + (c.unique_opens || 0),
                open_rate: 0,
                conversion_value:
                    acc.conversion_value + (c.conversion_value || 0),
            }),
            {
                total_recipients: 0,
                unique_placed_order: 0,
                place_order_rate: 0,
                unique_opens: 0,
                open_rate: 0,
                conversion_value: 0,
            }
        );
    }, [campaigns]);

    const renderCell = useCallback(
        (row: Record<string, unknown>, column: TableColumn) => {
            const val = row[column.id];
            switch (column.id) {
                case "campaign_name":
                    return (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <CheckCircleIcon
                                sx={{
                                    fontSize: "clamp(14px, 1vw, 18px)",
                                    color: "#059669",
                                }}
                            />
                            <Typography
                                sx={{
                                    fontSize: "clamp(12px, 0.85vw, 14px)",
                                    fontWeight: 500,
                                    color: "#111827",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "clamp(150px, 15vw, 250px)",
                                }}
                            >
                                {String(val || "")}
                            </Typography>
                        </Box>
                    );
                case "preview":
                    return (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <VisibilityOutlinedIcon
                                sx={{
                                    fontSize: "clamp(14px, 1vw, 18px)",
                                    color: "#9CA3AF",
                                    cursor: "pointer",
                                }}
                            />
                        </Box>
                    );
                case "total_recipients":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                color: "#111827",
                            }}
                        >
                            ${" "}
                            {Number(val || 0).toLocaleString("en-US")}
                        </Typography>
                    );
                case "place_order_rate":
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
                case "unique_placed_order":
                case "unique_opens":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                color: "#111827",
                            }}
                        >
                            {Number(val || 0).toLocaleString("en-US")}
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
                            {val !== null && val !== undefined
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
            switch (column.id) {
                case "campaign_name":
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
                case "total_recipients":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            ${" "}
                            {totals.total_recipients.toLocaleString("en-US")}
                        </Typography>
                    );
                case "unique_placed_order":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {totals.unique_placed_order.toLocaleString("en-US")}
                        </Typography>
                    );
                case "place_order_rate":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            {totals.total_recipients > 0
                                ? (
                                      (totals.unique_placed_order /
                                          totals.total_recipients) *
                                      100
                                  ).toFixed(2)
                                : "0.00"}{" "}
                            %
                        </Typography>
                    );
                case "unique_opens":
                    return (
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            ${" "}
                            {totals.unique_opens.toLocaleString("en-US")}
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
                            {m.open_rate.toFixed(2)} %
                        </Typography>
                    );
                default:
                    return null;
            }
        },
        [totals, m.open_rate]
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
                    display: "flex",
                    gap: "clamp(8px, 0.8vw, 16px)",
                    flexWrap: { xs: "wrap", md: "nowrap" },
                }}
            >
                <BenchmarkCard
                    period={bm.twoMonths}
                    label="2 Month(s)"
                    color="#3B82F6"
                    bgColor="#EFF6FF"
                />
                <BenchmarkCard
                    period={bm.sixMonths}
                    label="6 Month(s)"
                    color="#3B82F6"
                    bgColor="#EFF6FF"
                />
                <BenchmarkCard
                    period={bm.twelveMonths}
                    label="12 Month(s)"
                    color="#EC4899"
                    bgColor="#FDF2F8"
                />
            </Box>

            <Box
                sx={{
                    display: "flex",
                    gap: "clamp(8px, 0.8vw, 16px)",
                    flexWrap: { xs: "wrap", md: "nowrap" },
                }}
            >
                <CampaignMetricCard
                    title="Promo Recipients"
                    value={m.promo_recipients}
                    previousValue={pm.promo_recipients}
                    showComparison={showComparison}
                    formatType="number"
                />
                <CampaignMetricCard
                    title="Non Promo Recipients"
                    value={m.non_promo_recipients}
                    previousValue={pm.non_promo_recipients}
                    showComparison={showComparison}
                    formatType="number"
                />
                <CampaignMetricCard
                    title="Total Recipients"
                    value={m.total_recipients}
                    previousValue={pm.total_recipients}
                    showComparison={showComparison}
                    formatType="number"
                />
                <CampaignMetricCard
                    title="Open Rate"
                    value={m.open_rate}
                    previousValue={pm.open_rate}
                    showComparison={showComparison}
                    formatType="percent"
                />
            </Box>

            <Box
                sx={{
                    display: "flex",
                    gap: "clamp(8px, 0.8vw, 16px)",
                    flexWrap: { xs: "wrap", md: "nowrap" },
                }}
            >
                <CampaignMetricCard
                    title="Click Rate"
                    value={m.click_rate}
                    previousValue={pm.click_rate}
                    showComparison={showComparison}
                    formatType="percent"
                />
                <CampaignMetricCard
                    title="No. Of Emails"
                    value={m.num_emails}
                    previousValue={pm.num_emails}
                    showComparison={showComparison}
                    formatType="number"
                />
                <CampaignMetricCard
                    title="No. Of Unsubscribers"
                    value={m.num_unsubscribers}
                    previousValue={pm.num_unsubscribers}
                    showComparison={showComparison}
                    formatType="number"
                />
            </Box>

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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "clamp(10px, 0.8vw, 16px)",
                        borderBottom: "1px solid #E5E7EB",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "clamp(8px, 0.6vw, 12px)",
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: "clamp(14px, 1vw, 18px)",
                                fontWeight: 600,
                                color: "#111827",
                            }}
                        >
                            Campaign
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={showCompareData}
                                    onChange={(e) =>
                                        setShowCompareData(e.target.checked)
                                    }
                                />
                            }
                            label={
                                <Typography
                                    sx={{
                                        fontSize: "clamp(11px, 0.8vw, 13px)",
                                        color: "#6B7280",
                                    }}
                                >
                                    View Compare Data Records
                                </Typography>
                            }
                        />
                    </Box>
                </Box>

                <CommonTable
                    columns={campaignColumns}
                    rows={tableRows}
                    renderCell={renderCell}
                    sortConfig={sortConfig}
                    onSortChange={handleSortChange}
                    isLoading={loading}
                    enableSummaryRow={true}
                    renderSummaryRow={renderSummaryRow}
                    summaryRowPosition="bottom"
                    emptyMessage="No campaigns found for the selected date range"
                />
            </Box>
        </Box>
    );
};

export default CampaignsTab;
