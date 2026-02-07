import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper, Tabs, Tab, Typography, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../common_components/PageContainer";
import CustomDatePicker from "../../common_components/daterangepicker/CustomDatePicker";
import { selectToken } from "../../redux/authSlice";
import { emailMarketingService } from "../../services/emailMarketing.service";
import SummaryMetricCard from "./components/SummaryMetricCard";
import CampaignsTab from "./components/CampaignsTab";
import FlowsTab from "./components/FlowsTab";
import SmsMmsTab from "./components/SmsMmsTab";
import {
    EmailMarketingSummaryResponse,
    EmailMarketingCampaignsResponse,
    EmailMarketingBenchmarksResponse,
    EmailMarketingFlowsResponse,
    BenchmarkPeriod,
    CampaignMetrics,
    CampaignRecord,
    FlowRecord,
} from "../../types/emailMarketing.types";
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

const EmailMarketingMain: React.FC = () => {
    const navigate = useNavigate();
    const authToken = useSelector(selectToken);

    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);

    const now = today(getLocalTimeZone());
    const defaultStart = startOfMonth(now);
    const [dateRange, setDateRange] = useState<DateRange | null>({
        start: defaultStart,
        end: now,
    });
    const [compareRange, setCompareRange] = useState<DateRange | null>(() => {
        const compareStart = defaultStart.subtract({ months: 1 });
        const compareEnd = now.subtract({ months: 1 });
        return { start: compareStart, end: compareEnd };
    });

    const [lastUpdated, setLastUpdated] = useState<string>("");
    const [totalRevenue, setTotalRevenue] = useState({ current: 0, previous: 0 });
    const [emailRevenue, setEmailRevenue] = useState({ current: 0, previous: 0 });
    const [flowRevenue, setFlowRevenue] = useState({ current: 0, previous: 0 });
    const [campaignsRevenue, setCampaignsRevenue] = useState({ current: 0, previous: 0 });
    const [smsMmsRevenue, setSmsMmsRevenue] = useState({ current: 0, previous: 0 });

    const [benchmarks, setBenchmarks] = useState<{
        twoMonths: BenchmarkPeriod;
        sixMonths: BenchmarkPeriod;
        twelveMonths: BenchmarkPeriod;
    } | null>(null);

    const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics | null>(null);
    const [previousCampaignMetrics, setPreviousCampaignMetrics] = useState<CampaignMetrics | null>(null);
    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
    const [flows, setFlows] = useState<FlowRecord[]>([]);
    const [flowSummary, setFlowSummary] = useState<{
        total_delivered: number;
        total_conversion_value: number;
        avg_open_rate: number;
        avg_click_rate: number;
        total_recipients: number;
        total_unsubscribes: number;
    } | null>(null);

    const showComparison = compareRange !== null;

    const fetchData = useCallback(async () => {
        if (!authToken || !dateRange) return;

        setLoading(true);

        const params = {
            clientId: "",
            startDate: formatCalendarDate(dateRange.start),
            endDate: formatCalendarDate(dateRange.end),
            ...(compareRange
                ? {
                      compareStartDate: formatCalendarDate(compareRange.start),
                      compareEndDate: formatCalendarDate(compareRange.end),
                  }
                : {}),
        };

        try {
            const [summaryRes, campaignsRes, benchmarksRes, flowsRes] =
                await Promise.allSettled([
                    emailMarketingService.getSummary(params, authToken),
                    emailMarketingService.getCampaigns(params, authToken),
                    emailMarketingService.getBenchmarks(params, authToken),
                    emailMarketingService.getFlows(params, authToken),
                ]);

            if (summaryRes.status === "fulfilled" && summaryRes.value?.data) {
                const d = summaryRes.value.data;
                setLastUpdated(d.lastUpdated || "");
                setTotalRevenue(d.totalRevenue || { current: 0, previous: 0 });
                setEmailRevenue(d.emailRevenue || { current: 0, previous: 0 });
                setFlowRevenue(d.flowRevenue || { current: 0, previous: 0 });
                setCampaignsRevenue(d.campaignsRevenue || { current: 0, previous: 0 });
                setSmsMmsRevenue(d.smsMmsRevenue || { current: 0, previous: 0 });
            }

            if (campaignsRes.status === "fulfilled" && campaignsRes.value?.data) {
                const d = campaignsRes.value.data;
                setCampaignMetrics(d.metrics || null);
                setPreviousCampaignMetrics(d.previousMetrics || null);
                setCampaigns(d.campaigns || []);
            }

            if (benchmarksRes.status === "fulfilled" && benchmarksRes.value?.data) {
                setBenchmarks(benchmarksRes.value.data);
            }

            if (flowsRes.status === "fulfilled" && flowsRes.value?.data) {
                const d = flowsRes.value.data;
                setFlows(d.flows || []);
                setFlowSummary(d.summary || null);
            }
        } catch (error) {
            console.error("Failed to fetch email marketing data:", error);
        } finally {
            setLoading(false);
        }
    }, [authToken, dateRange, compareRange]);

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

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const formatDateDisplay = (d: CalendarDate): string => {
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        return `${months[d.month - 1]} ${String(d.day).padStart(2, "0")}, ${d.year}`;
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
        return `${month} ${day}, ${year}  at  ${hours}:${minutes} ${ampm}`;
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
                        Email Marketing
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
                        }}
                    >
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

                <Box
                    sx={{
                        display: "flex",
                        gap: "clamp(8px, 0.8vw, 16px)",
                        flexWrap: { xs: "wrap", md: "nowrap" },
                    }}
                >
                    <SummaryMetricCard
                        title="Total Revenue"
                        value={totalRevenue.current}
                        previousValue={totalRevenue.previous}
                        showComparison={showComparison}
                        icon="/assets/stats/revenue.svg"
                    />
                    <SummaryMetricCard
                        title="Email Revenue"
                        value={emailRevenue.current}
                        previousValue={emailRevenue.previous}
                        showComparison={showComparison}
                        icon="/assets/stats/revenue.svg"
                    />
                    <SummaryMetricCard
                        title="Flows Revenue"
                        value={flowRevenue.current}
                        previousValue={flowRevenue.previous}
                        showComparison={showComparison}
                        icon="/assets/stats/revenue.svg"
                    />
                    <SummaryMetricCard
                        title="Campaigns Revenue"
                        value={campaignsRevenue.current}
                        previousValue={campaignsRevenue.previous}
                        showComparison={showComparison}
                        icon="/assets/stats/revenue.svg"
                    />
                    <SummaryMetricCard
                        title="SMS/MMS Campaigns Revenue"
                        value={smsMmsRevenue.current}
                        previousValue={smsMmsRevenue.previous}
                        showComparison={showComparison}
                        icon="/assets/stats/revenue.svg"
                    />
                </Box>

                <Box
                    sx={{
                        borderBottom: "2px solid #E5E7EB",
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        sx={{
                            minHeight: "clamp(36px, 2.8vw, 48px)",
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontSize: "clamp(13px, 0.95vw, 16px)",
                                fontWeight: 500,
                                color: "#6B7280",
                                minHeight: "clamp(36px, 2.8vw, 48px)",
                                padding: "clamp(6px, 0.5vw, 12px) clamp(12px, 1vw, 24px)",
                                "&.Mui-selected": {
                                    color: "#EC4899",
                                    fontWeight: 600,
                                },
                            },
                            "& .MuiTabs-indicator": {
                                backgroundColor: "#EC4899",
                                height: "2px",
                            },
                        }}
                    >
                        <Tab label="Campaigns" />
                        <Tab label="Flows" />
                        <Tab label="SMS/MMS" />
                    </Tabs>
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

                {!loading && activeTab === 0 && (
                    <CampaignsTab
                        benchmarks={benchmarks}
                        metrics={campaignMetrics}
                        previousMetrics={previousCampaignMetrics}
                        campaigns={campaigns}
                        loading={false}
                        showComparison={showComparison}
                    />
                )}

                {!loading && activeTab === 1 && (
                    <FlowsTab
                        flows={flows}
                        summary={flowSummary}
                        loading={false}
                    />
                )}

                {!loading && activeTab === 2 && (
                    <SmsMmsTab
                        revenue={smsMmsRevenue.current}
                        previousRevenue={smsMmsRevenue.previous}
                        showComparison={showComparison}
                        loading={false}
                    />
                )}
            </Paper>
        </PageContainer>
    );
};

export default EmailMarketingMain;
