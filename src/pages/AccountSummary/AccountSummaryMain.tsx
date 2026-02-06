import { Paper, Box } from "@mui/material";
import moment from "moment";
import PageContainer from "../../common_components/PageContainer";
import VisibleClientsDropdown from "../../common_components/VisibleClientsDropdown";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PagesCommonHeader from "../../common_components/PagesCommonHeader";
import LastUpdatedInfo from "../../common_components/LastUpdatedInfo";
import { AppDispatch } from "../../redux/store";
import DateRangeTabs, { DateRange } from "./components/DateRangeTabs";
import ClientPerformanceTable from "./components/ClientPerformanceTable";
import {
    fetchAllAccountSummary,
    getHiddenClients,
    selectAllClients,
    selectAllClientsLoading,  // Updated selector
    selectAccountSummaryLastUpdated,
    selectHiddenClients,
} from "../../redux/accountSummarySlice";
import { fetchActiveClients, selectActiveClients } from "../../redux/utilitySlice";
import { selectToken } from "../../redux/authSlice";

const getClientIcon = (row: any): string | null => {
    const networks = row.networks || [];
    const isShopify = networks.some((n: any) => n.network?.toLowerCase() === "shopify");
    const isGA = networks.some((n: any) =>
        ["ga", "analytics", "google analytics"].includes(n.network?.toLowerCase())
    );
    if (isShopify) return "assets/shopify.svg";
    if (!isShopify && isGA) return "assets/analytics.svg";
    return null;
};

const AccountSummaryMain = () => {
    const dispatch = useDispatch<AppDispatch>();

    // Redux selectors
    const allClients = useSelector(selectAllClients);
    console.log("allClients", allClients)
    const loading = useSelector(selectAllClientsLoading); // Using specific loading for all clients
    const lastUpdated = useSelector(selectAccountSummaryLastUpdated);
    const hiddenClients = useSelector(selectHiddenClients);
    const activeClients = useSelector(selectActiveClients);
    const authToken = useSelector(selectToken);

    // Local state
    const [clients, setClients] = useState([]);
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange>("today");
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);

    // Helper to get date range from tab
    const getDateRange = (range: DateRange) => {
        const today = new Date();
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let startDate: string;
        let endDate: string = formatDate(today);

        switch (range) {
            case "today":
                startDate = formatDate(today);
                break;
            case "yesterday":
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = formatDate(yesterday);
                endDate = formatDate(yesterday);
                break;
            case "last7days":
                const last7Days = new Date(today);
                last7Days.setDate(last7Days.getDate() - 6);
                startDate = formatDate(last7Days);
                endDate = formatDate(today);
                break;
            case "last30days":
                const last30Days = new Date(today);
                last30Days.setDate(last30Days.getDate() - 29);
                startDate = formatDate(last30Days);
                endDate = formatDate(today);
                break;
            default:
                startDate = formatDate(today);
        }

        return { startDate, endDate };
    };

    // Initial data fetch
    useEffect(() => {
        fetchInitialData();
    }, [dispatch, authToken]); // Added dependencies

    // Update clients list when active clients or hidden clients change
    useEffect(() => {
        if (!activeClients.length || !initialDataLoaded) return;

        const list = activeClients.map(item => {
            const isHidden = hiddenClients.some(hidden => hidden.clientId === item._id);
            return {
                id: item._id,
                name: item.name,
                visible: !isHidden
            };
        });
        setClients(list);
    }, [activeClients, hiddenClients, initialDataLoaded]);

    // Fetch data when date range changes
    useEffect(() => {
        if (initialDataLoaded) {
            const { startDate, endDate } = getDateRange(selectedDateRange);
            dispatch(fetchAllAccountSummary({ startDate, endDate }));
        }
    }, [selectedDateRange, initialDataLoaded, dispatch]);

    const fetchInitialData = async () => {
        try {
            await dispatch(getHiddenClients()).unwrap();
            setInitialDataLoaded(true);
            // Then fetch active clients
            await dispatch(fetchActiveClients(authToken || "")).unwrap();

            const { startDate, endDate } = getDateRange(selectedDateRange);
            await dispatch(fetchAllAccountSummary({ startDate, endDate })).unwrap();
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        }
    };

    const handleRefresh = async () => {
        try {
            const { startDate, endDate } = getDateRange(selectedDateRange);
            await dispatch(fetchAllAccountSummary({ startDate, endDate })).unwrap();
        } catch (error: any) {
            console.error("Refresh failed", error);
            // You might want to show an error notification here
        }
    };

    // Handle date range change
    const handleDateRangeChange = (newRange: DateRange) => {
        setSelectedDateRange(newRange);
        // Data fetch will be triggered by the useEffect watching selectedDateRange
    };

    // Transform data for the table
    const tableData = useMemo(() => {
        if (!allClients || allClients.length === 0) return [];

        return allClients.map((client) => {
            const mapKey: Record<string, string> = {
                today: 'today',
                yesterday: 'yesterday',
                last7days: '7days',
                last30days: '30days'
            };

            const statsKey = mapKey[selectedDateRange];
            const monthlyStats = (client as any).monthly_stats;
            const dynamicRevenue = monthlyStats?.[statsKey] ?? client.overall_stats?.revenue ?? 0;
            const differenceObj = monthlyStats?.difference?.[statsKey];

            const curRev = Number(dynamicRevenue);
            const diffValue = Number(differenceObj?.value ?? 0);
            const prevRev = curRev - diffValue;
            const diffPercent = Number(differenceObj?.percentage ?? 0);

            return {
                id: client.client_id || client._id,
                _id: client.client_id || client._id,
                name: client.client_name || client.name,
                overall_stats: {
                    ...client.overall_stats,
                    revenue: curRev,
                    previous_revenue: prevRev
                },
                networks: client.networks,
                status: client.status,
                revenueChange: diffPercent,
                differenceChange: diffPercent,
                differenceValue: diffValue,
                icon: getClientIcon(client)
            };
        });
    }, [allClients, selectedDateRange]);


    // Filter visible clients
    // const visibleTableData = useMemo(() => {
    //     if (!clients.length) return tableData;

    //     const visibleClientIds = clients
    //         .filter(client => client.visible)
    //         .map(client => client.id);

    //     return tableData.filter(row => visibleClientIds.includes(row.id));
    // }, [tableData, clients]);

    return (
        <PageContainer>
            <Paper elevation={0} className="account-summary-container">
                <PagesCommonHeader
                    lastUpdatedSection={
                        <LastUpdatedInfo
                            updatedAt={lastUpdated}
                            onRefresh={handleRefresh}
                        // loading={loading}
                        />
                    }
                    rightSection={
                        <VisibleClientsDropdown
                            clients={clients}
                            onChange={setClients}
                            currentDateRange={getDateRange(selectedDateRange)}
                        // module="account_summary"
                        />
                    }
                />

                {/* Client Performance Table */}
                <Box
                    sx={{
                        mt: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        borderRadius: "10px",
                        border: "2px solid #E5E7EB"
                    }}
                >
                    <DateRangeTabs
                        selectedRange={selectedDateRange}
                        onChange={handleDateRangeChange}
                        sx={{ m: 1, marginBottom: 0 }}
                    // disabled={loading}
                    />
                    <ClientPerformanceTable
                        data={tableData}
                        loading={loading}
                        globalDateRange={selectedDateRange}
                    />
                </Box>
            </Paper>
        </PageContainer>
    );
};

export default AccountSummaryMain;