import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
} from "@mui/material";
import { useSelector } from "react-redux";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../common_components/PageContainer";
import CustomDatePicker from "../../common_components/daterangepicker/CustomDatePicker";
import { selectToken } from "../../redux/authSlice";
import { selectUserPermissions } from "../../redux/permissionsSlice";
import { selectActiveClients } from "../../redux/utilitySlice";
import { divergenceReportService } from "../../services/divergenceReport.service";
import {
    NetworkTableData,
    NetworkMetricRow,
    ChartSeriesData,
    GroupClient,
} from "../../types/divergenceReport.types";
import { Client } from "../../services/utility.service";
import ChartSection from "./components/ChartSection";
import NetworkTable from "./components/NetworkTable";
import { formatCurrency, formatNumber, formatPercent, formatDecimal } from "./components/NetworkTable";
import ConsolidatedTable from "./components/ConsolidatedTable";
import {
    getLocalTimeZone,
    today,
    startOfMonth,
    CalendarDate,
} from "@internationalized/date";

interface DateRange {
    start: CalendarDate;
    end: CalendarDate;
}

const formatCalendarDate = (d: CalendarDate): string => {
    const year = d.year;
    const month = String(d.month).padStart(2, "0");
    const day = String(d.day).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const SHOPIFY_COLUMNS = [
    { key: "period", label: "Month" },
    { key: "orders", label: "Orders", format: formatNumber },
    { key: "gross_sales", label: "Gross Sales", format: formatCurrency },
    { key: "discount", label: "Discount", format: formatCurrency },
    { key: "revenue", label: "Revenue", format: formatCurrency },
    { key: "sessions", label: "Sessions", format: formatNumber },
    { key: "conv_rate", label: "Conv. Rate (%)", format: formatPercent },
    { key: "aov", label: "AOV", format: formatCurrency },
];

const GA_COLUMNS = SHOPIFY_COLUMNS;

const META_COLUMNS = [
    { key: "period", label: "Month" },
    { key: "orders", label: "Orders", format: formatNumber },
    { key: "discount", label: "Discount", format: formatCurrency },
    { key: "revenue", label: "Revenue", format: formatCurrency },
    { key: "sessions", label: "Sessions", format: formatNumber },
    { key: "conv_rate", label: "Conv. Rate (%)", format: formatPercent },
    { key: "aov", label: "AOV", format: formatCurrency },
    { key: "discount_pct", label: "Discount (%)", format: formatPercent },
];

const ADWORD_COLUMNS = [
    { key: "period", label: "Month" },
    { key: "spend", label: "Spend", format: formatCurrency },
    { key: "revenue", label: "Revenue", format: formatCurrency },
    { key: "roas", label: "ROAS", format: formatDecimal },
    { key: "clicks", label: "Clicks", format: formatNumber },
    { key: "cpc", label: "CPC", format: formatCurrency },
    { key: "impressions", label: "Impressions", format: formatNumber },
    { key: "ctr", label: "CTR (%)", format: formatPercent },
];

const BING_COLUMNS = ADWORD_COLUMNS;
const CRITEO_COLUMNS = ADWORD_COLUMNS;

const EMAIL_COLUMNS = [
    { key: "period", label: "Month" },
    { key: "delivered", label: "Delivered", format: formatNumber },
    { key: "open_rate", label: "Open Rate (%)", format: formatPercent },
    { key: "click_rate", label: "Click Rate (%)", format: formatPercent },
    { key: "revenue", label: "Revenue", format: formatCurrency },
    { key: "conversion_value", label: "Conversion Value", format: formatCurrency },
    { key: "recipients", label: "Recipients", format: formatNumber },
    { key: "unsubscribes", label: "Unsubscribes", format: formatNumber },
];

const FLOW_COLUMNS = EMAIL_COLUMNS;

const NETWORK_CONFIG: Record<
    string,
    {
        title: string;
        icon?: string;
        columns: { key: string; label: string; format?: (v: number) => string }[];
    }
> = {
    shopify: { title: "Shopify", icon: "/assets/shopify.svg", columns: SHOPIFY_COLUMNS },
    ga: { title: "GA", icon: "/assets/analytics.svg", columns: GA_COLUMNS },
    meta: { title: "Meta", icon: "/assets/meta.svg", columns: META_COLUMNS },
    adword: { title: "Google Ads", icon: "/assets/googleads.svg", columns: ADWORD_COLUMNS },
    bing: { title: "Bing", columns: BING_COLUMNS },
    criteo: { title: "Criteo", columns: CRITEO_COLUMNS },
    email: { title: "Email (Klaviyo Campaign)", columns: EMAIL_COLUMNS },
    flow: { title: "Flow (Klaviyo Flow)", columns: FLOW_COLUMNS },
};

const EMPTY_METRIC_ROW: NetworkMetricRow = {
    period: "",
    orders: 0,
    gross_sales: 0,
    discount: 0,
    revenue: 0,
    sessions: 0,
    conv_rate: 0,
    aov: 0,
};

const DivergenceReportMain: React.FC = () => {
    const navigate = useNavigate();
    const authToken = useSelector(selectToken);
    const userPermissions = useSelector(selectUserPermissions);
    const activeClients = useSelector(selectActiveClients);

    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    const now = today(getLocalTimeZone());
    const yesterday = now.subtract({ days: 1 });
    const defaultStart = startOfMonth(now);

    const [dateRange, setDateRange] = useState<DateRange | null>({
        start: defaultStart,
        end: yesterday,
    });
    const [compareRange, setCompareRange] = useState<DateRange | null>(() => {
        const compareStart = defaultStart.subtract({ years: 1 });
        const compareEnd = yesterday.subtract({ years: 1 });
        return { start: compareStart, end: compareEnd };
    });

    const [aggregation, setAggregation] = useState<"day" | "week" | "month">("month");
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [groupClients, setGroupClients] = useState<GroupClient[]>([]);

    const [chartData, setChartData] = useState<ChartSeriesData | null>(null);
    const [, setComparisonChartData] = useState<ChartSeriesData | null>(null);
    const [networks, setNetworks] = useState<NetworkTableData[]>([]);
    const [consolidated, setConsolidated] = useState<NetworkTableData | null>(null);
    const [connectedNetworks, setConnectedNetworks] = useState<string[]>([]);

    const divergencePermission = userPermissions?.divergence_report;
    const clientScope = divergencePermission?.client_scope || "all";

    const filteredClients = useMemo(() => {
        const paidMediaClients = activeClients.filter(
            (c: Client) => c.type === "paid_media" && c.status === "active"
        );

        if (clientScope === "all") return paidMediaClients;
        return paidMediaClients;
    }, [activeClients, clientScope]);

    useEffect(() => {
        if (filteredClients.length > 0 && !selectedClientId) {
            setSelectedClientId(filteredClients[0]._id);
        }
    }, [filteredClients, selectedClientId]);

    useEffect(() => {
        if (!selectedClientId || !activeClients.length) return;

        const selected = activeClients.find((c: Client) => c._id === selectedClientId);
        if (!selected?.main_account_id) {
            setGroupClients([]);
            return;
        }

        const group = activeClients.filter(
            (c: Client) =>
                c.main_account_id === selected.main_account_id ||
                c._id === selected.main_account_id ||
                selected._id === c.main_account_id
        );
        setGroupClients(
            group.map((c: Client) => ({
                _id: c._id,
                name: c.name,
                main_account_id: c.main_account_id,
            }))
        );
    }, [selectedClientId, activeClients]);

    const fetchData = useCallback(async () => {
        if (!authToken || !dateRange || !selectedClientId) return;

        setLoading(true);

        const params = {
            clientId: selectedClientId,
            groupClientIds: groupClients.map((g) => g._id),
            startDate: formatCalendarDate(dateRange.start),
            endDate: formatCalendarDate(dateRange.end),
            aggregation,
            ...(compareRange
                ? {
                      compareStartDate: formatCalendarDate(compareRange.start),
                      compareEndDate: formatCalendarDate(compareRange.end),
                  }
                : {}),
        };

        try {
            const response = await divergenceReportService.getReport(params, authToken);

            if (response?.data) {
                const d = response.data;
                setLastUpdated(d.last_updated || "");
                setChartData(d.charts || null);
                setComparisonChartData(d.comparison_charts || null);
                setNetworks(d.networks || []);
                setConsolidated(d.consolidated || null);
                setConnectedNetworks(d.connected_networks || []);
            }
        } catch (error) {
            console.error("Failed to fetch divergence report:", error);
        } finally {
            setLoading(false);
        }
    }, [authToken, dateRange, compareRange, selectedClientId, groupClients, aggregation]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDateApply = useCallback(
        (data: {
            mainRange: DateRange | null;
            compareRange: DateRange | null;
        }) => {
            setDateRange(data.mainRange);
            setCompareRange(data.compareRange);
        },
        []
    );

    const handleClientChange = (e: SelectChangeEvent) => {
        setSelectedClientId(e.target.value);
    };

    const formatLastUpdated = (dateStr: string): string => {
        if (!dateStr) return "--";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "--";
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const month = months[d.getMonth()];
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();
        let hours = d.getHours();
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
    };

    const getNetworkTable = (networkKey: string): NetworkTableData | undefined => {
        return networks.find((n) => n.network.toLowerCase() === networkKey);
    };

    return (
        <PageContainer>
            <Paper
                elevation={0}
                sx={{
                    backgroundColor: "transparent",
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(12px, 1vw, 20px)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(8px, 0.6vw, 12px)",
                    }}
                >
                    <ArrowBackIcon
                        sx={{
                            fontSize: "clamp(18px, 1.4vw, 24px)",
                            color: "#111827",
                            cursor: "pointer",
                        }}
                        onClick={() => navigate(-1)}
                    />
                    <Typography
                        sx={{
                            fontSize: "clamp(18px, 1.4vw, 24px)",
                            fontWeight: 600,
                            color: "#111827",
                            lineHeight: 1.3,
                        }}
                    >
                        Divergence Report
                    </Typography>
                </Box>

                <Box
                    sx={{
                        width: "100%",
                        bgcolor: "#FFFFFF",
                        borderRadius: "clamp(8px, 0.6vw, 12px)",
                        border: "1px solid #E5E7EB",
                        px: "clamp(12px, 1.2vw, 24px)",
                        py: "clamp(10px, 0.8vw, 16px)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "clamp(8px, 0.6vw, 12px)",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: "clamp(11px, 0.8vw, 14px)",
                                fontWeight: 500,
                                color: "#6B7280",
                                lineHeight: 1.2,
                            }}
                        >
                            Last updated
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "clamp(12px, 0.85vw, 14px)",
                                fontWeight: 500,
                                color: "#111827",
                                lineHeight: 1.3,
                            }}
                        >
                            {formatLastUpdated(lastUpdated)}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: "clamp(8px, 0.6vw, 12px)",
                            flexWrap: "wrap",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(4px, 0.3vw, 8px)" }}>
                            <Typography
                                sx={{
                                    fontSize: "clamp(11px, 0.8vw, 14px)",
                                    fontWeight: 500,
                                    color: "#6B7280",
                                }}
                            >
                                Group Store :
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: "clamp(140px, 12vw, 220px)" }}>
                                <Select
                                    value={selectedClientId}
                                    onChange={handleClientChange}
                                    displayEmpty
                                    sx={{
                                        fontSize: "clamp(11px, 0.8vw, 13px)",
                                        fontWeight: 500,
                                        borderRadius: "clamp(4px, 0.3vw, 8px)",
                                        bgcolor: "#F9FAFB",
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: "#E5E7EB",
                                        },
                                    }}
                                >
                                    {filteredClients.map((client: Client) => (
                                        <MenuItem
                                            key={client._id}
                                            value={client._id}
                                            sx={{ fontSize: "13px" }}
                                        >
                                            {client.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(4px, 0.3vw, 8px)" }}>
                            <Typography
                                sx={{
                                    fontSize: "clamp(11px, 0.8vw, 14px)",
                                    fontWeight: 500,
                                    color: "#6B7280",
                                }}
                            >
                                Date Range
                            </Typography>
                            <CustomDatePicker
                                value={dateRange}
                                compareValue={compareRange}
                                onChange={setDateRange}
                                onCompareChange={setCompareRange}
                                onApply={handleDateApply}
                                comparison={true}
                            />
                        </Box>
                    </Box>
                </Box>

                {loading && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                        }}
                    >
                        <CircularProgress size={32} />
                    </Box>
                )}

                {!loading && (
                    <>
                        <ChartSection
                            chartData={chartData}
                            connectedNetworks={connectedNetworks}
                            aggregation={aggregation}
                            onAggregationChange={setAggregation}
                        />

                        {connectedNetworks.map((networkKey) => {
                            const config = NETWORK_CONFIG[networkKey.toLowerCase()];
                            const data = getNetworkTable(networkKey.toLowerCase());

                            if (!config || !data) return null;

                            return (
                                <NetworkTable
                                    key={networkKey}
                                    title={config.title}
                                    icon={config.icon}
                                    rows={data.rows}
                                    summary={data.summary || EMPTY_METRIC_ROW}
                                    columns={config.columns}
                                />
                            );
                        })}

                        {consolidated && (
                            <ConsolidatedTable
                                rows={consolidated.rows}
                                summary={consolidated.summary || EMPTY_METRIC_ROW}
                            />
                        )}
                    </>
                )}
            </Paper>
        </PageContainer>
    );
};

export default DivergenceReportMain;
