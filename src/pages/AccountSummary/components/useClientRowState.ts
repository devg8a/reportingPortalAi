import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../redux/store';
import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date";
import moment from "moment";
import { fetchSingleAccountSummary, fetchPerformanceReport, fetchPerformanceEntities } from "../../../redux/accountSummarySlice";
import { DateRange } from "./DateRangeTabs";

// Types
export type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly';
export const granularityMap = {
    day: "daily",
    week: "weekly",
    month: "monthly",
} as const;


interface ExpandedRowState {
    selectedRange: DateRange;
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
    compareStartDate: CalendarDate | null;
    compareEndDate: CalendarDate | null;
    activeTab: string;
    fetchedData: any | null;
    isLoadingData: boolean;
    viewMode: 'account_summary' | 'performance_report';
    granularity: Granularity;
    performanceData?: any;
    isLoadingPerformance?: boolean;
    entityList?: { id: string; name: string; visible: boolean }[];
    entitiesData?: any;
    selectedGroup?: string;
    selectedEntity?: string;
}

// Helpers
const formatCalendarDate = (date: CalendarDate): string => {
    const year = date.year;
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDateRangeFromTab = (range: DateRange): { start: string; end: string; compareStart?: string; compareEnd?: string } => {
    const now = moment();
    const todayStr = now.format('YYYY-MM-DD');

    switch (range) {
        case 'today':
            const yesterday = now.clone().subtract(1, 'days');
            return {
                start: todayStr,
                end: todayStr,
                compareStart: yesterday.format('YYYY-MM-DD'),
                compareEnd: yesterday.format('YYYY-MM-DD')
            };

        case 'yesterday':
            const yest = now.clone().subtract(1, 'days');
            const dayBefore = now.clone().subtract(2, 'days');
            return {
                start: yest.format('YYYY-MM-DD'),
                end: yest.format('YYYY-MM-DD'),
                compareStart: dayBefore.format('YYYY-MM-DD'),
                compareEnd: dayBefore.format('YYYY-MM-DD')
            };

        case 'last7days':
            const l7Start = now.clone().subtract(6, 'days');
            const l7End = now.clone();
            const prev7Start = l7Start.clone().subtract(7, 'days');
            const prev7End = l7Start.clone().subtract(1, 'days');
            return {
                start: l7Start.format('YYYY-MM-DD'),
                end: l7End.format('YYYY-MM-DD'),
                compareStart: prev7Start.format('YYYY-MM-DD'),
                compareEnd: prev7End.format('YYYY-MM-DD')
            };

        case 'last30days':
            const l30Start = now.clone().subtract(29, 'days');
            const l30End = now.clone();
            const prev30Start = l30Start.clone().subtract(30, 'days');
            const prev30End = l30Start.clone().subtract(1, 'days');
            return {
                start: l30Start.format('YYYY-MM-DD'),
                end: l30End.format('YYYY-MM-DD'),
                compareStart: prev30Start.format('YYYY-MM-DD'),
                compareEnd: prev30End.format('YYYY-MM-DD')
            };

        case 'week': // Week -> Last 7 days vs Same dates in Previous Month (Month-over-Month)
            const wStart = now.clone().subtract(6, 'days');
            const wEnd = now.clone();
            const wCompareStart = wStart.clone().subtract(1, 'month');
            const wCompareEnd = wEnd.clone().subtract(1, 'month');
            return {
                start: wStart.format('YYYY-MM-DD'),
                end: wEnd.format('YYYY-MM-DD'),
                compareStart: wCompareStart.format('YYYY-MM-DD'),
                compareEnd: wCompareEnd.format('YYYY-MM-DD')
            };

        case 'month': // Month -> This/Last Month vs Same dates Last Month
            const todayDate = moment();
            let mStart, mEnd;
            if (todayDate.date() !== 1) {
                mStart = todayDate.clone().startOf('month');
                mEnd = todayDate.clone().subtract(1, 'day');
            } else {
                mStart = todayDate.clone().subtract(1, 'month').startOf('month');
                mEnd = todayDate.clone().subtract(1, 'month').endOf('month');
            }
            const mCompareStart = mStart.clone().subtract(1, 'month');
            const mCompareEnd = mEnd.clone().subtract(1, 'month');

            return {
                start: mStart.format('YYYY-MM-DD'),
                end: mEnd.format('YYYY-MM-DD'),
                compareStart: mCompareStart.format('YYYY-MM-DD'),
                compareEnd: mCompareEnd.format('YYYY-MM-DD')
            };

        case 'day': // Day -> Month to Yesterday (or Prev Month if today is 1st)
            const dNow = moment();
            let dStart, dEnd;
            if (dNow.date() !== 1) {
                dStart = dNow.clone().startOf('month');
                dEnd = dNow.clone().subtract(1, 'day');
            } else {
                dStart = dNow.clone().subtract(1, 'month').startOf('month');
                dEnd = dNow.clone().subtract(1, 'month').endOf('month');
            }

            const dCompareStart = dStart.clone().subtract(1, 'month');
            const dCompareEnd = dEnd.clone().subtract(1, 'month');

            return {
                start: dStart.format('YYYY-MM-DD'),
                end: dEnd.format('YYYY-MM-DD'),
                compareStart: dCompareStart.format('YYYY-MM-DD'),
                compareEnd: dCompareEnd.format('YYYY-MM-DD')
            };

        default:
            return { start: todayStr, end: todayStr };
    }
};


export const useClientRowState = (data: any[]) => {
    const dispatch = useDispatch<AppDispatch>();
    const [expandedRowState, setExpandedRowState] = useState<Record<string, ExpandedRowState>>({});

    // Helper to get defaults or current state
    const getRowState = (rowId: string, row: any) => {
        const defaultState: ExpandedRowState = {
            selectedRange: "today",
            startDate: today(getLocalTimeZone()),
            endDate: today(getLocalTimeZone()),
            compareStartDate: null,
            compareEndDate: null,
            activeTab: row?.networks?.[0]?.network ? row.networks[0].network.toLowerCase() : "all channels",
            fetchedData: null,
            isLoadingData: false,
            viewMode: 'account_summary',
            performanceData: null,
            isLoadingPerformance: false,
            selectedGroup: "All",
            selectedEntity: "",
            granularity: "daily"
        };
        return expandedRowState[rowId] || defaultState;
    };


    // Helper to convert YYYY-MM-DD string to CalendarDate
    const toCalendarDate = (dateStr?: string): CalendarDate | null => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new CalendarDate(year, month, day);
    };


    const getStartEnd = (state: ExpandedRowState) => {
        // ... (rest of function remains same, logic handles state.startDate now being present)
        let start = "";
        let end = "";
        let compareStart: string | undefined = undefined;
        let compareEnd: string | undefined = undefined;

        if (state.startDate && state.endDate) {
            start = formatCalendarDate(state.startDate);
            end = formatCalendarDate(state.endDate);
        } else {
            const { start: s, end: e } = getDateRangeFromTab(state.selectedRange || "today");
            start = s;
            end = e;
        }

        if (state.compareStartDate && state.compareEndDate) {
            compareStart = formatCalendarDate(state.compareStartDate);
            compareEnd = formatCalendarDate(state.compareEndDate);
        }

        return { start, end, compareStart, compareEnd };
    };


    const fetchClientData = async (
        rowId: string,
        clientId: string,
        startDate: string,
        endDate: string,
        compareStartDate?: string,
        compareEndDate?: string,
        granularity: Granularity = 'daily'
    ) => {
        setExpandedRowState(prev => ({
            ...prev,
            [rowId]: { ...(prev[rowId] || getRowState(rowId, null)), isLoadingData: true }
        }));

        try {
            const result = await dispatch(fetchSingleAccountSummary({
                startDate,
                endDate,
                compareStartDate,
                compareEndDate,
                clientId,
                aggregation: granularity
            })).unwrap();

            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: {
                    ...prev[rowId],
                    fetchedData: result.data[0] || null,
                    isLoadingData: false
                }
            }));
        } catch (error) {
            console.error('Error fetching client data:', error);
            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: { ...prev[rowId], isLoadingData: false }
            }));
        }
    };

    const fetchPerformance = async (
        rowId: string,
        row: any,
        state: ExpandedRowState,
        overrides: Partial<{ group: string; entityIds: string[]; aggregation: Granularity }> = {}
    ) => {
        const { start, end, compareStart, compareEnd } = getStartEnd(state);
        const group = overrides.group || state.selectedGroup || "All";
        const entityIds = overrides.entityIds || [];
        const aggregation = overrides.aggregation || state.granularity || "daily";

        setExpandedRowState(prev => ({
            ...prev,
            [rowId]: { ...state, isLoadingPerformance: true }
        }));

        try {
            const res = await dispatch(fetchPerformanceReport({
                client_id: row._id || row.id,
                start_date: start,
                end_date: end,
                group,
                entity_ids: entityIds,
                compare_start_date: compareStart,
                compare_end_date: compareEnd,
                aggregation
            })).unwrap();

            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: {
                    ...prev[rowId],
                    performanceData: res.data,
                    isLoadingPerformance: false,
                    selectedGroup: overrides.group !== undefined ? overrides.group : prev[rowId].selectedGroup,
                    entityList: overrides.entityIds !== undefined ? prev[rowId].entityList : prev[rowId].entityList // bit trickier for logic
                }
            }));
        } catch {
            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: { ...prev[rowId], isLoadingPerformance: false }
            }));
        }
    };

    const initializeRowFromGlobal = async (rowId: string, globalRange: DateRange) => {
        if (expandedRowState[rowId]) return;

        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;

        const { start, end, compareStart, compareEnd } = getDateRangeFromTab(globalRange);

        const autoGranularity: Granularity = calculateGranularity(start, end);

        const currentState = getRowState(rowId, row);

        const newState: ExpandedRowState = {
            ...currentState,
            selectedRange: globalRange,
            startDate: toCalendarDate(start),
            endDate: toCalendarDate(end),
            compareStartDate: toCalendarDate(compareStart),
            compareEndDate: toCalendarDate(compareEnd),
            granularity: autoGranularity,
            isLoadingData: true,
        };

        setExpandedRowState(prev => ({ ...prev, [rowId]: newState }));

        // Fetch data
        await fetchClientData(rowId, row._id || row.id, start, end, compareStart, compareEnd, autoGranularity);
    };

    const handleDateRangeTabChange = async (rowId: string, range: DateRange) => {
        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;

        const { start, end, compareStart, compareEnd } = getDateRangeFromTab(range);
        const autoGranularity: Granularity = calculateGranularity(start, end);

        const currentState = getRowState(rowId, row);
        const newState = {
            ...currentState,
            selectedRange: range,
            startDate: toCalendarDate(start),
            endDate: toCalendarDate(end),
            compareStartDate: toCalendarDate(compareStart),
            compareEndDate: toCalendarDate(compareEnd),
            activeTab: "all channels",
            granularity: autoGranularity,
            isLoadingPerformance: currentState.viewMode === 'performance_report'
        };

        setExpandedRowState(prev => ({ ...prev, [rowId]: newState }));

        fetchClientData(rowId, row._id || row.id, start, end, compareStart, compareEnd, autoGranularity);

        if (newState.viewMode === 'performance_report') {
            fetchPerformance(rowId, row, newState, { aggregation: "daily" });
        }
    };

    const calculateGranularity = (startDate: string, endDate: string): Granularity => {
        const start = moment(startDate);
        const end = moment(endDate);
        const daysDiff = end.diff(start, 'days') + 1;

        if (daysDiff <= 1) return 'hourly';
        if (daysDiff <= 14) return 'daily';
        if (daysDiff <= 90) return 'weekly';
        return 'monthly';
    };

    const handleDateApply = async (
        rowId: string,
        mainRange: { start: CalendarDate; end: CalendarDate } | null,
        compareRange: { start: CalendarDate; end: CalendarDate } | null
    ) => {
        if (!mainRange) return;
        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;

        const start = formatCalendarDate(mainRange.start);
        const end = formatCalendarDate(mainRange.end);
        const compareStart = compareRange?.start ? formatCalendarDate(compareRange.start) : undefined;
        const compareEnd = compareRange?.end ? formatCalendarDate(compareRange.end) : undefined;

        const autoGranularity: Granularity = calculateGranularity(start, end);

        const currentState = getRowState(rowId, row);

        const newState = {
            ...currentState,
            startDate: mainRange.start,
            endDate: mainRange.end,
            compareStartDate: compareRange?.start || null,
            compareEndDate: compareRange?.end || null,
            granularity: autoGranularity,
            isLoadingPerformance: currentState.viewMode === 'performance_report'
        };

        setExpandedRowState(prev => ({ ...prev, [rowId]: newState }));

        fetchClientData(rowId, row._id || row.id, start, end, compareStart, compareEnd, autoGranularity);

        if (newState.viewMode === 'performance_report') {
            fetchPerformance(rowId, row, newState, { aggregation: "daily" }); // Original logic was daily for PR here too?
        }
    };

    const handleGranularityChange = async (rowId: string, value: Granularity) => {
        // Calculate new range based on granularity
        let newRange: DateRange = "day";
        if (value === 'daily') newRange = 'day';
        if (value === 'weekly') newRange = 'week';
        if (value === 'monthly') newRange = 'month';
        if (rowId === 'all_clients') {
            const rowState = expandedRowState[rowId] || getRowState(rowId, null);
            let start = "", end = "";

            if (rowState.startDate && rowState.endDate) {
                start = formatCalendarDate(rowState.startDate);
                end = formatCalendarDate(rowState.endDate);
            } else {
                // Fallback (shouldn't happen if initialized)
                const d = getDateRangeFromTab('day');
                start = d.start;
                end = d.end;
            }

            setExpandedRowState(prev => {
                const current = prev[rowId] || getRowState(rowId, null);
                return {
                    ...prev,
                    [rowId]: {
                        ...current,
                        granularity: value,
                        selectedRange: newRange, // Update to sync tab highlighting
                    }
                };
            });

            await fetchClientData(rowId, 'all_clients', start, end, undefined, undefined, value);
            return;
        }

        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;
        const currentState = getRowState(rowId, row);

        // Extract dates as strings for API
        let start = "", end = "";
        let compareStart: string | undefined = undefined;
        let compareEnd: string | undefined = undefined;

        if (currentState.startDate && currentState.endDate) {
            start = formatCalendarDate(currentState.startDate);
            end = formatCalendarDate(currentState.endDate);
        } else {
            const d = getDateRangeFromTab(currentState.selectedRange || "today");
            start = d.start;
            end = d.end;
        }

        if (currentState.compareStartDate && currentState.compareEndDate) {
            compareStart = formatCalendarDate(currentState.compareStartDate);
            compareEnd = formatCalendarDate(currentState.compareEndDate);
        }

        setExpandedRowState(prev => {
            const current = prev[rowId] || getRowState(rowId, null);
            return {
                ...prev,
                [rowId]: {
                    ...current,
                    granularity: value,
                    selectedRange: newRange, // Update to sync tab highlighting
                    isLoadingData: currentState.viewMode !== 'performance_report',
                    isLoadingPerformance: currentState.viewMode === 'performance_report'
                }
            };
        });

        // Call appropriate API based on view mode
        if (currentState.viewMode === 'performance_report') {
            // Get new dates for the selected range
            const { start: newStart, end: newEnd, compareStart: newCompareStart, compareEnd: newCompareEnd } = getDateRangeFromTab(newRange);

            const newState = {
                ...currentState,
                granularity: value,
                selectedRange: newRange,
                startDate: toCalendarDate(newStart),
                endDate: toCalendarDate(newEnd),
                compareStartDate: toCalendarDate(newCompareStart),
                compareEndDate: toCalendarDate(newCompareEnd),
                isLoadingPerformance: true
            };
            fetchPerformance(rowId, row, newState, { aggregation: value });
        } else {
            fetchClientData(
                rowId,
                row._id || row.id,
                start,
                end,
                compareStart,
                compareEnd,
                value
            );
        }
    };

    const handleGroupChange = async (rowId: string, group: string) => {
        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;
        const currentState = getRowState(rowId, row);

        const entityList = group === "All" ? [] : currentState.entitiesData?.find((g: any) => g.group_name === group)?.data.map((en: any) => ({
            id: en.entity_id,
            name: en.entity_name,
            visible: true,
        })) || [];

        const newState = { ...currentState, selectedGroup: group, entityList };

        fetchPerformance(rowId, row, newState, { group });
    };

    const handleEntityToggle = async (rowId: string, updatedEntities: any[]) => {
        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;
        const currentState = getRowState(rowId, row);

        const excludedIds = updatedEntities.filter(e => !e.visible).map(e => e.id);

        const newState = { ...currentState, entityList: updatedEntities };
        const { start, end, compareStart, compareEnd } = getStartEnd(currentState);

        setExpandedRowState(prev => ({
            ...prev,
            [rowId]: { ...newState, isLoadingPerformance: true }
        }));

        try {
            const res = await dispatch(fetchPerformanceReport({
                client_id: row._id || row.id,
                start_date: start,
                end_date: end,
                group: currentState.selectedGroup || "All",
                entity_ids: excludedIds,
                compare_start_date: compareStart,
                compare_end_date: compareEnd,
                aggregation: "daily"
            })).unwrap();

            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: {
                    ...prev[rowId],
                    performanceData: res.data,
                    isLoadingPerformance: false
                }
            }));
        } catch {
            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: { ...prev[rowId], isLoadingPerformance: false }
            }));
        }
    };

    const toggleViewMode = async (rowId: string) => {
        const row = data.find(r => (r._id || r.id) === rowId);
        if (!row) return;
        const currentState = getRowState(rowId, row);

        if (currentState.viewMode === 'performance_report') {
            // Map Performance ranges back to Account Summary ranges
            let accountRange: DateRange = currentState.selectedRange;
            if (currentState.selectedRange === 'day') accountRange = 'today';
            if (currentState.selectedRange === 'week') accountRange = 'last7days';
            if (currentState.selectedRange === 'month') accountRange = 'last30days';

            setExpandedRowState(prev => ({
                ...prev,
                [rowId]: { ...currentState, viewMode: 'account_summary', selectedRange: accountRange }
            }));
        } else {
            // Switch to PR - Default to Month view
            const { start, end, compareStart, compareEnd } = getDateRangeFromTab('month');

            const newState: ExpandedRowState = {
                ...currentState,
                viewMode: 'performance_report',
                startDate: toCalendarDate(start),
                endDate: toCalendarDate(end),
                compareStartDate: toCalendarDate(compareStart),
                compareEndDate: toCalendarDate(compareEnd),
                selectedRange: 'month',
                granularity: 'monthly',
                isLoadingPerformance: true,
                selectedGroup: 'All',
                selectedEntity: ''
            };

            setExpandedRowState(prev => ({ ...prev, [rowId]: newState }));

            try {
                const reportResult = await dispatch(fetchPerformanceReport({
                    client_id: row._id || row.id,
                    start_date: start,
                    end_date: end,
                    compare_start_date: compareStart,
                    compare_end_date: compareEnd,
                    group: 'All',
                    entity_ids: [],
                    aggregation: 'monthly'
                })).unwrap();

                setExpandedRowState(prev => ({
                    ...prev,
                    [rowId]: {
                        ...prev[rowId],
                        performanceData: reportResult.data,
                        isLoadingPerformance: false
                    }
                }));
            } catch (err) {
                setExpandedRowState(prev => ({
                    ...prev,
                    [rowId]: { ...prev[rowId], isLoadingPerformance: false }
                }));
            }

            // Fetch Entities (Leagues/Teams)
            try {
                const entitiesResult = await dispatch(fetchPerformanceEntities({ client_id: row._id || row.id })).unwrap();
                setExpandedRowState(prev => ({
                    ...prev,
                    [rowId]: {
                        ...prev[rowId],
                        entitiesData: entitiesResult.data
                    }
                }));
            } catch (err) {
                console.error("Failed to fetch entities", err);
            }
        }
    };

    const setRowActiveTab = (rowId: string, tab: string) => {
        setExpandedRowState(prev => ({
            ...prev,
            [rowId]: { ...prev[rowId], activeTab: tab }
        }));
    };

    return {
        expandedRowState,
        setExpandedRowState,
        getRowState, // helper
        handleDateRangeTabChange,
        handleDateApply,
        handleGranularityChange,
        handleGroupChange,
        handleEntityToggle,
        toggleViewMode,
        setRowActiveTab,
        initializeRowFromGlobal,

    };
};
