import React, { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../common_components/PageContainer";
import CustomDatePicker from "../../common_components/daterangepicker/CustomDatePicker";
import { TableColumn } from "../../common_components/tableTypes";
import ChartSection from "./components/ChartSection";
import NetworkTable from "./components/NetworkTable";
import ConsolidatedTable from "./components/ConsolidatedTable";
import {
    SHOPIFY_DUMMY_ROWS,
    SHOPIFY_DUMMY_SUMMARY,
    META_DUMMY_ROWS,
    META_DUMMY_SUMMARY,
    ADWORD_DUMMY_ROWS,
    ADWORD_DUMMY_SUMMARY,
    BING_DUMMY_ROWS,
    BING_DUMMY_SUMMARY,
    CRITEO_DUMMY_ROWS,
    CRITEO_DUMMY_SUMMARY,
    EMAIL_DUMMY_ROWS,
    EMAIL_DUMMY_SUMMARY,
    FLOW_DUMMY_ROWS,
    FLOW_DUMMY_SUMMARY,
    CONSOLIDATED_DUMMY_ROWS,
    CONSOLIDATED_DUMMY_SUMMARY,
} from "./dummyData";
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

const mkCol = (id: string, label: string, width?: string): TableColumn => ({
    id,
    label,
    width,
    align: id === "period" ? "left" : "right",
    sortable: false,
    draggable: false,
});

const SHOPIFY_COLUMNS: TableColumn[] = [
    mkCol("period", "Dates", "120px"),
    mkCol("orders", "Orders"),
    mkCol("gross_sales", "Gross Sales"),
    mkCol("discount", "Discount"),
    mkCol("revenue", "Revenue"),
    mkCol("sessions", "Sessions"),
    mkCol("conv_rate", "Conv. Rate (%)"),
    mkCol("aov", "AOV"),
];

const GA_COLUMNS: TableColumn[] = [
    mkCol("period", "Dates", "120px"),
    mkCol("sessions", "Sessions"),
    mkCol("revenue", "Revenue"),
    mkCol("conv_rate", "Conv. Rate (%)"),
    mkCol("aov", "AOV"),
    mkCol("discount_pct", "Discount (%)"),
];

const META_COLUMNS: TableColumn[] = [
    mkCol("period", "Dates", "120px"),
    mkCol("spend", "Spend"),
    mkCol("revenue", "Revenue"),
    mkCol("roas", "ROAS"),
    mkCol("clicks", "Clicks"),
    mkCol("cpc", "CPC"),
    mkCol("impressions", "Impressions"),
    mkCol("ctr", "CTR (%)"),
];

const ADWORD_COLUMNS: TableColumn[] = [
    mkCol("period", "Dates", "120px"),
    mkCol("spend", "Spend"),
    mkCol("revenue", "Revenue"),
    mkCol("roas", "ROAS"),
    mkCol("clicks", "Clicks"),
    mkCol("cpc", "CPC"),
    mkCol("impressions", "Impressions"),
    mkCol("ctr", "CTR (%)"),
];

const BING_COLUMNS: TableColumn[] = ADWORD_COLUMNS;
const CRITEO_COLUMNS: TableColumn[] = ADWORD_COLUMNS;

const EMAIL_COLUMNS: TableColumn[] = [
    mkCol("period", "Dates", "120px"),
    mkCol("delivered", "Delivered"),
    mkCol("open_rate", "Open Rate (%)"),
    mkCol("click_rate", "Click Rate (%)"),
    mkCol("revenue", "Revenue"),
    mkCol("conversion_value", "Conversion Value"),
    mkCol("recipients", "Recipients"),
    mkCol("unsubscribes", "Unsubscribes"),
];

const FLOW_COLUMNS: TableColumn[] = EMAIL_COLUMNS;

const CONSOLIDATED_COLUMNS: TableColumn[] = [
    mkCol("period", "Month", "100px"),
    mkCol("orders", "Orders"),
    mkCol("gross_sales", "Gross Sales"),
    mkCol("discount", "Discount"),
    mkCol("revenue", "Revenue"),
    mkCol("sessions", "Sessions"),
    mkCol("conv_rate", "Conv. Rate (%)"),
    mkCol("aov", "AOV"),
    mkCol("discount_pct", "Discount (%)"),
    mkCol("google_cost", "Google Cost"),
    mkCol("meta_cost", "Meta Cost"),
    mkCol("total_cost", "Total Cost"),
    mkCol("roas", "ROAS"),
];

const NETWORK_TABLES = [
    { key: "shopify", title: "Shopify", icon: "/assets/shopify.svg", columns: SHOPIFY_COLUMNS, rows: SHOPIFY_DUMMY_ROWS, summary: SHOPIFY_DUMMY_SUMMARY },
    { key: "ga", title: "GA", icon: "/assets/analytics.svg", columns: GA_COLUMNS, rows: SHOPIFY_DUMMY_ROWS, summary: SHOPIFY_DUMMY_SUMMARY },
    { key: "meta", title: "Meta", icon: "/assets/meta.svg", columns: META_COLUMNS, rows: META_DUMMY_ROWS, summary: META_DUMMY_SUMMARY },
    { key: "adword", title: "Google Ads", icon: "/assets/google_ads.svg", columns: ADWORD_COLUMNS, rows: ADWORD_DUMMY_ROWS, summary: ADWORD_DUMMY_SUMMARY },
    { key: "bing", title: "Bing", columns: BING_COLUMNS, rows: BING_DUMMY_ROWS, summary: BING_DUMMY_SUMMARY },
    { key: "criteo", title: "Criteo", columns: CRITEO_COLUMNS, rows: CRITEO_DUMMY_ROWS, summary: CRITEO_DUMMY_SUMMARY },
    { key: "email", title: "Klaviyo Campaign", columns: EMAIL_COLUMNS, rows: EMAIL_DUMMY_ROWS, summary: EMAIL_DUMMY_SUMMARY },
    { key: "flow", title: "Klaviyo Flow", columns: FLOW_COLUMNS, rows: FLOW_DUMMY_ROWS, summary: FLOW_DUMMY_SUMMARY },
];

const DivergenceReportMain: React.FC = () => {
    const navigate = useNavigate();

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
    const [selectedClient, setSelectedClient] = useState("demo_client_1");
    const [selectedGroup, setSelectedGroup] = useState("all_stores");

    const handleDateApply = (data: { mainRange: DateRange | null; compareRange: DateRange | null }) => {
        setDateRange(data.mainRange);
        setCompareRange(data.compareRange);
    };

    const formatDateRange = (): string => {
        if (!dateRange) return "Select dates";
        const fmtDate = (d: CalendarDate) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[d.month - 1]} ${d.day}, ${d.year}`;
        };
        let str = `${fmtDate(dateRange.start)} - ${fmtDate(dateRange.end)}`;
        if (compareRange) {
            str += `  |  ${fmtDate(compareRange.start)} - ${fmtDate(compareRange.end)}`;
        }
        return str;
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
                <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(8px, 0.6vw, 12px)" }}>
                    <ArrowBackIcon
                        sx={{ fontSize: "clamp(18px, 1.4vw, 24px)", color: "#111827", cursor: "pointer" }}
                        onClick={() => navigate(-1)}
                    />
                    <Typography sx={{ fontSize: "clamp(18px, 1.4vw, 24px)", fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>
                        Divergence Report
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "clamp(8px, 0.6vw, 12px)",
                        bgcolor: "#FFFFFF",
                        borderRadius: "clamp(8px, 0.6vw, 12px)",
                        border: "1px solid #E5E7EB",
                        px: "clamp(12px, 1.2vw, 24px)",
                        py: "clamp(10px, 0.8vw, 16px)",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(8px, 0.6vw, 12px)", flexWrap: "wrap" }}>
                        <FormControl size="small" sx={{ minWidth: "clamp(140px, 12vw, 220px)" }}>
                            <Select
                                value={selectedClient}
                                onChange={(e: SelectChangeEvent) => setSelectedClient(e.target.value)}
                                sx={{
                                    fontSize: "clamp(11px, 0.8vw, 13px)",
                                    fontWeight: 600,
                                    borderRadius: "clamp(4px, 0.3vw, 8px)",
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E5E7EB" },
                                }}
                            >
                                <MenuItem value="demo_client_1" sx={{ fontSize: "13px" }}>Demo Client 1</MenuItem>
                                <MenuItem value="demo_client_2" sx={{ fontSize: "13px" }}>Demo Client 2</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(8px, 0.6vw, 12px)", flexWrap: "wrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(4px, 0.3vw, 8px)" }}>
                            <Typography sx={{ fontSize: "clamp(11px, 0.8vw, 14px)", fontWeight: 500, color: "#6B7280" }}>
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

                        <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(4px, 0.3vw, 8px)" }}>
                            <Typography sx={{ fontSize: "clamp(11px, 0.8vw, 14px)", fontWeight: 500, color: "#6B7280" }}>
                                Group Store :
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: "clamp(120px, 10vw, 180px)" }}>
                                <Select
                                    value={selectedGroup}
                                    onChange={(e: SelectChangeEvent) => setSelectedGroup(e.target.value)}
                                    sx={{
                                        fontSize: "clamp(11px, 0.8vw, 13px)",
                                        fontWeight: 500,
                                        borderRadius: "clamp(4px, 0.3vw, 8px)",
                                        bgcolor: "#F9FAFB",
                                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E5E7EB" },
                                    }}
                                >
                                    <MenuItem value="all_stores" sx={{ fontSize: "13px" }}>All Stores</MenuItem>
                                    <MenuItem value="store_1" sx={{ fontSize: "13px" }}>Store 1</MenuItem>
                                    <MenuItem value="store_2" sx={{ fontSize: "13px" }}>Store 2</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(6px, 0.4vw, 10px)",
                        bgcolor: "#FFFFFF",
                        borderRadius: "clamp(8px, 0.6vw, 12px)",
                        border: "1px solid #E5E7EB",
                        px: "clamp(12px, 1.2vw, 24px)",
                        py: "clamp(6px, 0.5vw, 10px)",
                    }}
                >
                    <Typography sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", color: "#6B7280" }}>
                        Last updated:
                    </Typography>
                    <Typography sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", fontWeight: 500, color: "#111827" }}>
                        Jun 30, 2025 at 2:00 PM
                    </Typography>
                    <Typography sx={{ fontSize: "clamp(10px, 0.7vw, 12px)", color: "#9CA3AF", ml: "clamp(8px, 0.6vw, 16px)" }}>
                        {formatDateRange()}
                    </Typography>
                </Box>

                <ChartSection
                    aggregation={aggregation}
                    onAggregationChange={setAggregation}
                />

                {NETWORK_TABLES.map((net) => (
                    <NetworkTable
                        key={net.key}
                        title={net.title}
                        icon={net.icon}
                        rows={net.rows}
                        summaryRow={net.summary}
                        columns={net.columns}
                        metricKeys={net.columns.filter(c => c.id !== "period").map(c => c.id)}
                    />
                ))}

                <ConsolidatedTable
                    rows={CONSOLIDATED_DUMMY_ROWS}
                    summaryRow={CONSOLIDATED_DUMMY_SUMMARY}
                    columns={CONSOLIDATED_COLUMNS}
                />
            </Paper>
        </PageContainer>
    );
};

export default DivergenceReportMain;
