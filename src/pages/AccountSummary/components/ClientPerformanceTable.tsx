import {
    Box,
    Avatar,
    Typography,
    CircularProgress,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import CommonTable from "../../../common_components/CommonTable";
import { TableColumn } from "../../../common_components/tableTypes";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DateRangeTabs, { DateRange } from "./DateRangeTabs";
import { AppDispatch } from "../../../redux/store";
import { EXPAND_TRIGGERS } from "../../../common_components/tableConstants";
import CustomDatePicker from "../../../common_components/daterangepicker/CustomDatePicker";
import ClientStatsGrid from "./ClientStatsGrid";
import { useClientRowState, Granularity, granularityMap } from "./useClientRowState";
import SportPerformance from "./SportPerformance";
import VisibleClientsDropdown from "../../../common_components/VisibleClientsDropdown";
import AnalyticsLineChart from "../../../common_components/AnalyticsLineChart/AnalyticsLineChart";
import FiltersRow from "./FiltersRow";
import { SortConfig } from "../../../common_components/tableTypes";
import { formatStat } from "../../../helper/statsFormatter";
import { StyledCurrency } from "../../../helper/StyledCurrency";
import GranularityDropdown from "./GranularityDropdown";
import IOSSwitch from "../../../common_components/IOSSwitch";
import CommonLoader from "../../../common_components/CommonLoader";


interface ClientPerformanceTableProps {
    data: any[];
    loading?: boolean;
    globalDateRange: DateRange;
}


const ClientPerformanceTable: React.FC<ClientPerformanceTableProps> = ({ data, loading, globalDateRange }) => {
    // console.log(loading, "aaaaaaaaaaaa")
    const dispatch = useDispatch<AppDispatch>();
    const [isCompareOn, setIsCompareOn] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        columnId: null,
        direction: "asc"
    });

    // State to track which rows show Value instead of Percentage for Difference column
    const [differenceModes, setDifferenceModes] = useState<Record<string, boolean>>({});

    const toggleDifferenceMode = (rowId: string) => {
        setDifferenceModes(prev => ({
            ...prev,
            [rowId]: !prev[rowId]
        }));
    };

    // ✅ Use Custom Hook
    const {
        expandedRowState,
        handleDateRangeTabChange,
        handleDateApply,
        handleGranularityChange,
        handleGroupChange,
        handleEntityToggle,
        toggleViewMode,
        setRowActiveTab,
        getRowState,
        initializeRowFromGlobal, // 👈 NEW from hook
    } = useClientRowState(data);

    const columns: TableColumn[] = [
        {
            id: "name",
            label: "Client List",
            width: "60%",
            sortable: true,
            draggable: false,

            align: "left",
        },
        {
            id: "revenue",
            label: "Revenue",
            width: "20%",
            sortable: true,
            draggable: false,
            align: "center",   // ✅
        },
        {
            id: "difference",
            label: "Difference",
            width: "20%",
            sortable: true,
            draggable: false,
            align: "center",   // ✅
        },
    ];


    const renderCell = (row: any, column: TableColumn) => {

        switch (column.id) {

            case "name":
                return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>

                        {row.id !== "all_clients" && (
                            row.icon ? (
                                <img
                                    src={row.icon}
                                    style={{


                                        ...(row.icon.includes("analytics")
                                            ? {
                                                width: 24,
                                                height: 24,
                                            }
                                            : {
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                backgroundColor: "#ECFDF3",
                                                padding: 2,
                                            }),
                                    }}
                                />
                            ) : (
                                <div style={{ display: "flex" }}>
                                    <img
                                        src="assets/google_ads.svg"
                                        style={
                                            {
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                backgroundColor: "#EEF4FF",
                                                padding: 5,

                                            }}
                                    />
                                    <img
                                        src="assets/meta.svg"
                                        style={
                                            {
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                backgroundColor: "#ecfbfdff",
                                                padding: 5,
                                                position: "relative",
                                                left: -10

                                            }}
                                    />
                                </div>
                            )
                        )}


                        <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                            {row.name}
                        </Typography>
                    </Box>
                );

            case "revenue": {
                const revenue = row.overall_stats?.revenue || 0;

                return (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between", // ✅ column align center
                            gap: 1.5,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {/* Values */}
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                            <Typography >
                                <StyledCurrency className="valueclassclient" value={formatStat(revenue, "revenue")} />
                            </Typography>

                            <Typography sx={{ fontSize: "12px", lineHeight: 1.2 }}>
                                <StyledCurrency className="valueclass2" value={formatStat(0, "revenue")} />
                            </Typography>
                        </Box>

                        {/* Badge */}
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                px: 2,
                                py: "6px",
                                borderRadius: "9999px",
                                bgcolor: "#dcfce7",
                                color: "#16a34a",
                                fontSize: "12px",
                                fontWeight: 600,
                                lineHeight: 1,
                            }}
                        >
                            0%
                            <TrendingUpIcon sx={{ fontSize: 14 }} className="iconUp" />

                        </Box>
                    </Box>
                );
            }

            case "difference":
                const diffPercent = row.differenceChange || 0;
                const diffValue = row.differenceValue || 0;
                const isDiffPositive = diffPercent >= 0;

                // Toggle state logic
                const isValueMode = differenceModes[row.id];

                return (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            cursor: "pointer",
                            // bgcolor: isDiffPositive ? "#dcfce7" : "#fee2e2",
                            userSelect: "none"
                        }}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row expand
                            toggleDifferenceMode(row.id);
                        }}
                    >
                        <Box
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1.5,
                                py: "4px",
                                minWidth: "80px",
                                justifyContent: "center",
                                borderRadius: "9999px",
                                bgcolor: isDiffPositive ? "#dcfce7" : "#fee2e2",
                                color: isDiffPositive ? "#16a34a" : "#dc2626",
                                fontSize: "12px",
                                fontWeight: 700,
                                transition: "all 0.2s"
                            }}
                        >
                            {isValueMode
                                ? <StyledCurrency className="valueclassclient" value={formatStat(diffValue, "revenue")} /> // Show as Currency
                                : `${Math.abs(diffPercent)}%`      // Show as Percent
                            }

                            {isDiffPositive ? (
                                <TrendingUpIcon className="iconUp" sx={{ fontSize: "14px", color: "#16a34a" }} />
                            ) : (
                                <TrendingDownIcon className="iconDown" sx={{ fontSize: "14px", color: "#dc2626" }} />
                            )}
                        </Box>
                    </Box>
                );

        }
    };


    const renderExpandedContent = (row: any) => {
        const rowClientId = row._id || row.id;

        const normalize = (str: string) => (str || "").toLowerCase().trim();
        const normalizedName = normalize(row.name || "");
        const canShowPerformance = ["urban savage", "pro standard"].includes(normalizedName);

        const rowId = row._id || row.id;
        const isSpecialClientForAdword = normalizedName === "urban savage";

        const currentState = getRowState(rowId, row);

        const isPerformanceReport = currentState.viewMode === 'performance_report';

        // Use fetched data if available, otherwise use original row data
        const dataToUse = currentState.fetchedData || row;


        const selectedNetwork = dataToUse.networks?.find(
            (net: any) => normalize(net.network) === normalize(currentState.activeTab)
        );
        const networkData = selectedNetwork || dataToUse.networks?.[0];

        const isComparisonActive = !!currentState.compareStartDate && !!currentState.compareEndDate;

        // Helper function - component ke andar ya bahar
        const getChartSeries = (chartData: any, activeTab: string) => {
            const tab = normalize(activeTab);

            const series = [
                // Common metrics (all tabs)
                chartData.series?.revenue && {
                    name: "Revenue",
                    data: chartData.series.revenue,
                    color: "#ec4899",
                },
                chartData.series?.spend && {
                    name: "Spend",
                    data: chartData.series.spend,
                    color: "#10b981",
                },
                chartData.series?.roas && {
                    name: "ROAS",
                    data: chartData.series.roas,
                    color: "#6366f1",
                    yAxisIndex: 1,
                },
                chartData.series?.cpc && {
                    name: "CPC",
                    data: chartData.series.cpc,
                    color: "#f59e0b",
                    yAxisIndex: 1,
                },
            ];

            // Tab-specific metrics
            if (tab === 'all channels' && chartData.series?.sessions) {
                series.push({
                    name: "Sessions",
                    data: chartData.series.sessions,
                    color: "#8b5cf6",
                });
            }

            if (tab === 'meta' && chartData.series?.outbound_clicks) {
                series.push({
                    name: "Outbound Clicks",
                    data: chartData.series.outbound_clicks,
                    color: "#14b8a6",
                });
            }

            if (tab === 'adword' && chartData.series?.clicks) {
                series.push({
                    name: "Clicks",
                    data: chartData.series.clicks,
                    color: "#0ea5e9",
                });
            }

            return series.filter(Boolean);
        };

        const isUrbanSavage = normalizedName === "urban savage";
        const isProStandard = normalizedName === "pro standard";


        const normalizedRange = currentState.selectedRange;

        const isAnyLoading =
            (!isPerformanceReport && currentState.isLoadingData) ||
            (isPerformanceReport && currentState.isLoadingPerformance);

        return (
            <Box
                sx={{
                    p: 1,
                    bgcolor: "white",
                    borderTop: "1px solid #f1f5f9",
                    borderBottom: "1px solid #f1f5f9",
                    borderRadius: "10px"
                }}
            >
                {/* Header Row: DateRangeTabs + View Toggle */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    width: '100%'
                }} >
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2, border: "2px solid #ddd", padding: "10px 11px", borderRadius: "10px" }}>
                        <DateRangeTabs
                            selectedRange={normalizedRange}
                            mode={isPerformanceReport ? "performance" : "account"}
                            onChange={(range) => {
                                if (isPerformanceReport) {
                                    handleGranularityChange(
                                        rowId,
                                        range === "day" ? "daily" : range === "week" ? "weekly" : "monthly"
                                    );
                                } else {
                                    handleDateRangeTabChange(rowId, range);
                                }
                            }}
                        />

                        {canShowPerformance && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: !isPerformanceReport ? 700 : 500,
                                        color: !isPerformanceReport ? '#0f172a' : '#64748b',
                                        transition: 'color 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => !isPerformanceReport && toggleViewMode(rowId)}
                                >
                                    Account Summary
                                </Typography>

                                {/* ✅ iOS Switch Replaced Here */}
                                <IOSSwitch
                                    checked={isPerformanceReport}
                                    onChange={() => toggleViewMode(rowId)}
                                />

                                <Typography
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: isPerformanceReport ? 700 : 500,
                                        color: isPerformanceReport ? '#0f172a' : '#64748b',
                                        transition: 'color 0.2s',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Performance Report
                                </Typography>
                            </Box>
                        )}
                    </Box>

                </Box>

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2, border: "2px solid #ddd", padding: "10px 11px", borderRadius: "10px" }}>

                    {/* Filters & Custom Date Picker Row */}
                    <Box
                        sx={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                        <Box sx={{ display: 'flex', width: "100%", gap: 2, alignItems: 'center' }}>
                            {/* Hide CustomDatePicker for "All Clients" */}
                            {row.id !== "all_clients" && (
                                <Box sx={{ flexShrink: 0 }}>
                                    <CustomDatePicker
                                        value={
                                            currentState.startDate && currentState.endDate
                                                ? { start: currentState.startDate, end: currentState.endDate }
                                                : null
                                        }
                                        compareValue={
                                            currentState.compareStartDate && currentState.compareEndDate
                                                ? { start: currentState.compareStartDate, end: currentState.compareEndDate }
                                                : null
                                        }
                                        onApply={(data) => {
                                            if (data.mainRange && data.mainRange.start && data.mainRange.end) {
                                                handleDateApply(rowId, data.mainRange as any, data.compareRange as any);
                                            }
                                        }}
                                        comparison={true}
                                        placeholder="Select Date Range"
                                        comparePlaceholder="Compare Range"
                                    />
                                </Box>
                            )}


                            {!isPerformanceReport && (
                                <GranularityDropdown
                                    startDate={currentState.startDate}
                                    endDate={currentState.endDate}
                                    granularity={currentState.granularity || 'daily'}
                                    onChange={(value) => handleGranularityChange(rowId, value as Granularity)}
                                />
                            )}
                        </Box>

                        {/* Filters (Only for Performance Report) */}
                        {isPerformanceReport && (
                            <FiltersRow
                                selectedLeague={currentState.selectedGroup || "All"}
                                leagueOptions={[
                                    { label: "All", value: "All" },
                                    ...(currentState.entitiesData?.map((g: any) => ({
                                        label: g.group_name,
                                        value: g.group_name,
                                    })) || []),
                                ]}
                                leagueLabel={
                                    isUrbanSavage ? "Product Type" : "League"
                                }

                                teamLabel={
                                    isProStandard ? "Team" : ""
                                }
                                onLeagueChange={(val) => handleGroupChange(rowId, val)}

                                renderTeamSelect={() => (
                                    currentState.selectedGroup !== "All" ? (
                                        <Box sx={{ width: 220 }}>
                                            <VisibleClientsDropdown
                                                showIcon={false}
                                                label="Team : All"
                                                itemName="teams"
                                                enableUpdateButton
                                                clients={currentState.entityList || []}
                                                onItemToggle={async () => { }}
                                                onChange={(updated: any[]) =>
                                                    handleEntityToggle(rowId, updated)
                                                }
                                            />
                                        </Box>
                                    ) : null
                                )}

                                onExport={() => console.log("Export clicked")}
                                onCopy={() => console.log("Copy/Save clicked")}
                            />
                        )}



                    </Box>
                </Box>

                {isAnyLoading ? (

                    <CommonLoader loaderClass="custom-loader-class" containerClassName="embedded-loader-container expand" />
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, my: 2, border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0px" }}>
                        {/* Tabs */}
                        <Box
                            sx={{
                                display: "flex",
                                width: "100%",
                                borderBottom: "1px solid #e5e7eb",
                                mb: 2
                            }}
                        >
                            {(() => {
                                const baseTabs = ["All Channels", "meta", "adword"];
                                const tabs =
                                    isPerformanceReport && isSpecialClientForAdword
                                        ? ["All Channels", "meta"]
                                        : baseTabs;

                                const activeTabSafe = tabs.some(t => normalize(t) === normalize(currentState.activeTab))
                                    ? currentState.activeTab
                                    : "All Channels";

                                return tabs.map((tab) => {
                                    const isActive = normalize(activeTabSafe) === normalize(tab);
                                    const tabLabel = normalize(tab) === "meta" ? "meta ads" : normalize(tab) === "adword" ? "google ads" : tab;
                                    console.log("tabLabel", tabLabel);
                                    return (
                                        <Box
                                            key={tab}
                                            onClick={() => setRowActiveTab(rowId, tab)}
                                            sx={{
                                                flex: 1,
                                                textAlign: "center",
                                                py: 2,
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontWeight: isActive ? 600 : 500,
                                                color: isActive ? "#FF008E" : "#6b7280",
                                                borderBottom: isActive
                                                    ? "2px solid #FF008E"
                                                    : "2px solid transparent",
                                                backgroundColor: isActive ? "#FFFAFD" : "transparent",
                                                transition: "all 0.2s ease",
                                                userSelect: "none",
                                                textTransform: "capitalize",
                                            }}
                                        >
                                            {tabLabel}
                                        </Box>
                                    );
                                });
                            })()}
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                            {/* ✅ Single Source Loading Flag */}
                            {(() => {


                                return (
                                    <>
                                        {/* ✅ Main Content */}
                                        {isPerformanceReport ? (
                                            <SportPerformance
                                                data={currentState.performanceData}
                                                entities={currentState.entitiesData}
                                                loading={!!currentState.isLoadingPerformance}
                                                activeTab={currentState.activeTab || "All Channels"}
                                                clientId={rowId}
                                            />
                                        ) : (
                                            networkData && (
                                                <ClientStatsGrid
                                                    networkData={networkData}
                                                    isComparisonActive={isComparisonActive}
                                                    activeTab={currentState.activeTab}
                                                    row={row}
                                                />
                                            )
                                        )}

                                        {/* ✅ Chart Render Safe */}
                                        {!isPerformanceReport &&
                                            networkData?.chart_data && (
                                                <Box>
                                                    <AnalyticsLineChart
                                                        onCompareToggle={setIsCompareOn}
                                                        categories={networkData.chart_data.labels}
                                                        series={getChartSeries(
                                                            networkData.chart_data,
                                                            currentState.activeTab
                                                        )}
                                                        height={320}
                                                        showLegend
                                                        comparison={(() => {
                                                            const tab = normalize(currentState.activeTab);

                                                            const baseSeries = {
                                                                revenue: networkData.chart_data.comparison_series?.revenue,
                                                                spend: networkData.chart_data.comparison_series?.spend,
                                                                roas: networkData.chart_data.comparison_series?.roas,
                                                                cpc: networkData.chart_data.comparison_series?.cpc,
                                                            };

                                                            if (tab === "all channels") {
                                                                return {
                                                                    labels: networkData.chart_data.comparison_labels,
                                                                    series: {
                                                                        ...baseSeries,
                                                                        sessions:
                                                                            networkData.chart_data.comparison_series?.sessions,
                                                                    },
                                                                };
                                                            }

                                                            if (tab === "meta") {
                                                                return {
                                                                    labels: networkData.chart_data.comparison_labels,
                                                                    series: {
                                                                        ...baseSeries,
                                                                        outbound_clicks:
                                                                            networkData.chart_data.comparison_series
                                                                                ?.outbound_clicks,
                                                                    },
                                                                };
                                                            }

                                                            if (tab === "adword") {
                                                                return {
                                                                    labels: networkData.chart_data.comparison_labels,
                                                                    series: {
                                                                        ...baseSeries,
                                                                        clicks:
                                                                            networkData.chart_data.comparison_series?.clicks,
                                                                    },
                                                                };
                                                            }

                                                            return {
                                                                labels: networkData.chart_data.comparison_labels,
                                                                series: baseSeries,
                                                            };
                                                        })()}
                                                    />
                                                </Box>
                                            )}
                                    </>
                                );
                            })()}
                        </Box>

                    </Box>

                )}


            </Box>
        );
    };

    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [showFilterRow, setShowFilterRow] = useState(false);
    const [activeFilterColumnId, setActiveFilterColumnId] = useState<string | null>(null);


    const handleSortChange = (columnId: string | null, direction: "asc" | "desc" | null) => {
        setSortConfig({
            columnId,
            direction: direction || "asc"
        });
    };


    const handleExpandToggle = (rowId: string) => {
        setExpandedRowId(prev => {
            const isExpanding = prev !== rowId;
            if (isExpanding) {
                initializeRowFromGlobal(rowId, globalDateRange);
            }
            return isExpanding ? rowId : null;
        });
    };
    const handleColumnFilterChange = (columnId: string, value: string) => {
        setColumnFilters(prev => ({
            ...prev,
            [columnId]: value,
        }));
    };

    const columnFilterConfig = {
        enable: true,
        columns: {
            name: { type: "search" },        // ✅ MATCH
            revenue: { type: "search" },     // optional
            difference: { type: "search" },  // optional
        },
    };

    const filteredData = useMemo(() => {
        const realClients = data?.filter((d) => d.id !== "all_clients");
        console.log("realClients", realClients)
        console.log("data", data)

        if (realClients.length === 0) return [];

        return data;
    }, [data]);


    const sortedData = useMemo(() => {
        if (!sortConfig.columnId) return filteredData;

        return [...filteredData].sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.columnId) {
                case "name":
                    aVal = a.name?.toLowerCase() || "";
                    bVal = b.name?.toLowerCase() || "";
                    break;
                case "revenue":
                    aVal = a.overall_stats?.revenue || 0;
                    bVal = b.overall_stats?.revenue || 0;
                    break;
                case "difference":
                    aVal = a.differenceChange || 0;
                    bVal = b.differenceChange || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);


    return (
        <>
            {loading ? <CommonLoader /> : (

                <CommonTable
                    columns={columns}
                    rows={sortedData}
                    renderCell={renderCell}
                    renderExpandedContent={renderExpandedContent}
                    expandTrigger={EXPAND_TRIGGERS.ICON}
                    onExpandToggle={handleExpandToggle}
                    controlledExpandedRows={expandedRowId ? new Set([expandedRowId]) : new Set()}
                    sortConfig={sortConfig}
                    onSortChange={handleSortChange}
                    columnFilterConfig={columnFilterConfig}
                    enableColumnActions={true}
                    enableColumnFilters={true}
                    enableColumnReorder={true}
                    showFilterRow={showFilterRow}
                    activeFilterColumnId={activeFilterColumnId}
                    onFilterRowToggle={(payload) => {
                        if (!payload || payload.mode === "all") {
                            setActiveFilterColumnId(null);
                            setShowFilterRow(prev => !prev);
                            return;
                        }

                        if (payload.mode === "single" && payload.columnId) {
                            setActiveFilterColumnId(payload.columnId);
                            setShowFilterRow(true);
                        }
                    }}
                    columnFilters={columnFilters}
                    onColumnFilterChange={handleColumnFilterChange}
                    tableHeadClassName="client-performance-table-head"
                    expandCellClassName="reusable-table-header-cell reusable-table-header-cell-expand account-summary-table-expand-cell"
                />
            )}

        </>
    );

};

export default ClientPerformanceTable;