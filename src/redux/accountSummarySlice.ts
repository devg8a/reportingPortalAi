import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { accountSummaryService } from "../services/accountSummary.service";
import {
    AccountSummaryRequestParams,
    AccountSummaryResponse,
    ClientSummary,
    HiddenClient,
    HideClientRequest,
    UnhideClientRequest,
    TriggerCronRequest,
    HourlyCronStatus,
    PerformanceReportRequest,
    PerformanceReportResponse,
    GetPerformanceEntitiesRequest,
    GetPerformanceEntitiesResponse,
    PerformanceEntityGroup,
} from "../types/accountSummary.types";
import { AuthState } from "./authSlice";

// State Interface
export interface AccountSummaryState {
    // Account Summary Data - Separate loading states
    allClients: ClientSummary[];
    allClientsLoading: boolean;
    allClientsError: string | null;

    singleClient: ClientSummary | null;
    singleClientLoading: boolean;
    singleClientError: string | null;

    lastUpdated: string | null;

    // Hidden Clients
    hiddenClients: HiddenClient[];
    hiddenClientsLoading: boolean;
    hiddenClientsError: string | null;

    // Cron Status
    cronStatus: HourlyCronStatus | null;
    cronLoading: boolean;
    cronError: string | null;

    // UI State
    selectedDateRange: {
        startDate: string;
        endDate: string;
    };

    // Performance Report
    performanceReport: any | null;
    performanceReportLoading: boolean;
    performanceReportError: string | null;

    // Performance Entities
    performanceEntities: PerformanceEntityGroup[];
    performanceEntitiesLoading: boolean;
    performanceEntitiesError: string | null;
}

interface RootStateWithAuth {
    auth: AuthState;
    accountSummary: AccountSummaryState;
}

// Initial State
const initialState: AccountSummaryState = {
    allClients: [],
    allClientsLoading: false,
    allClientsError: null,

    singleClient: null,
    singleClientLoading: false,
    singleClientError: null,

    lastUpdated: null,

    hiddenClients: [],
    hiddenClientsLoading: false,
    hiddenClientsError: null,

    cronStatus: null,
    cronLoading: false,
    cronError: null,

    selectedDateRange: {
        startDate: "",
        endDate: "",
    },

    performanceReport: null,
    performanceReportLoading: false,
    performanceReportError: null,

    performanceEntities: [],
    performanceEntitiesLoading: false,
    performanceEntitiesError: null,
};

// Async Thunks

export const fetchAllAccountSummary = createAsyncThunk<
    AccountSummaryResponse,
    Omit<AccountSummaryRequestParams, "clientId">,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/fetchAll",
    async (params, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token || "";
            return await accountSummaryService.getAllAccountSummary(params, token);
        } catch (err: any) {
            return rejectWithValue(err.message || "Failed to fetch all clients summary");
        }
    }
);

export const fetchSingleAccountSummary = createAsyncThunk<
    AccountSummaryResponse,
    { clientId: string } & Omit<AccountSummaryRequestParams, "clientIds" | "clientId">,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/fetchSingle",
    async ({ clientId, ...params }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token || "";
            return await accountSummaryService.getSingleAccountSummary(clientId, params, token);
        } catch (err: any) {
            return rejectWithValue(err.message || "Failed to fetch single client summary");
        }
    }
);

export const refreshAccountSummary = createAsyncThunk<
    any,
    void,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/refreshAccountSummary",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.refreshAccountSummary(token);
            return response;
        } catch (error: any) {
            console.error("refreshAccountSummary error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to refresh account summary"
            );
        }
    }
);

export const hideClients = createAsyncThunk<
    HiddenClient[],
    string[],
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/hideClients",
    async (clientIds, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";
            const userId = auth?.user?._id || auth?.user?.id || "";

            const response = await accountSummaryService.hideClients(
                clientIds,
                "account_summary",
                userId,
                token
            );
            return response.hiddenClients;
        } catch (error: any) {
            console.error("hideClients error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to hide clients"
            );
        }
    }
);

export const unhideClients = createAsyncThunk<
    string[],
    string[],
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/unhideClients",
    async (clientIds, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.unhideClients(
                clientIds,
                "account_summary",
                token
            );
            return response.unhiddenClientIds;
        } catch (error: any) {
            console.error("unhideClients error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to unhide clients"
            );
        }
    }
);

export const getHiddenClients = createAsyncThunk<
    HiddenClient[],
    void,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/getHiddenClients",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.getHiddenClients(
                "account_summary",
                token
            );

            const flattenedClients = response.data.flatMap((doc: any) =>
                doc.client_ids.map((id: string) => ({
                    clientId: id,
                    module_key: doc.module_key,
                    hidden_by: doc.hidden_by,
                    reason: doc.reason
                }))
            );

            return flattenedClients;
        } catch (error: any) {
            console.error("getHiddenClients error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to fetch hidden clients"
            );
        }
    }
);

export const triggerHourlyCron = createAsyncThunk<
    any,
    TriggerCronRequest,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/triggerHourlyCron",
    async (params, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.triggerHourlyCron(params, token);
            return response;
        } catch (error: any) {
            console.error("triggerHourlyCron error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to trigger hourly cron"
            );
        }
    }
);

export const getCronStatus = createAsyncThunk<
    HourlyCronStatus,
    void,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/getCronStatus",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.getCronStatus(token);
            return response.data;
        } catch (error: any) {
            console.error("getCronStatus error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to fetch cron status"
            );
        }
    }
);

export const fetchPerformanceReport = createAsyncThunk<
    PerformanceReportResponse,
    PerformanceReportRequest,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "performance/report",
    async (params, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.getSportPerformanceReport(params, token);
            return response;
        } catch (error: any) {
            console.error("fetchPerformanceReport error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to fetch performance report"
            );
        }
    }
);

export const fetchPerformanceEntities = createAsyncThunk<
    GetPerformanceEntitiesResponse,
    GetPerformanceEntitiesRequest,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "accountSummary/fetchPerformanceEntities",
    async (params, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token || "";

            const response = await accountSummaryService.getPerformanceEntities(params, token);
            return response;
        } catch (error: any) {
            console.error("fetchPerformanceEntities error:", error);
            return rejectWithValue(
                error?.response?.data?.message || error.message || "Failed to fetch performance entities"
            );
        }
    }
);

// Slice
const accountSummarySlice = createSlice({
    name: "accountSummary",
    initialState,
    reducers: {
        setDateRange: (state, action: PayloadAction<{ startDate: string; endDate: string }>) => {
            state.selectedDateRange = action.payload;
        },
        clearAllClientsData: (state) => {
            state.allClients = [];
            state.allClientsError = null;
        },
        clearSingleClientData: (state) => {
            state.singleClient = null;
            state.singleClientError = null;
        },
        clearAccountSummaryData: (state) => {
            state.allClients = [];
            state.singleClient = null;
            state.allClientsError = null;
            state.singleClientError = null;
            state.lastUpdated = null;
        },
        clearAccountSummaryError: (state) => {
            state.allClientsError = null;
            state.singleClientError = null;
        },
        clearHiddenClientsError: (state) => {
            state.hiddenClientsError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // All Clients - Separate loading states
            .addCase(fetchAllAccountSummary.pending, (state) => {
                state.allClientsLoading = true;
                state.allClientsError = null;
            })
            .addCase(fetchAllAccountSummary.fulfilled, (state, action) => {
                state.allClientsLoading = false;
                state.allClients = action.payload.data;
                state.lastUpdated = action.payload.last_updated || null;
            })
            .addCase(fetchAllAccountSummary.rejected, (state, action) => {
                state.allClientsLoading = false;
                state.allClientsError = action.payload as string;
            })

            // Single Client - Separate loading states
            .addCase(fetchSingleAccountSummary.pending, (state) => {
                state.singleClientLoading = true;
                state.singleClientError = null;
            })
            .addCase(fetchSingleAccountSummary.fulfilled, (state, action) => {
                state.singleClientLoading = false;
                state.singleClient = action.payload.data?.[0] || null;
                state.lastUpdated = action.payload.last_updated || null;
            })
            .addCase(fetchSingleAccountSummary.rejected, (state, action) => {
                state.singleClientLoading = false;
                state.singleClientError = action.payload as string;
            })

            // Refresh Account Summary
            .addCase(refreshAccountSummary.pending, (state) => {
                state.allClientsLoading = true;
                state.allClientsError = null;
            })
            .addCase(refreshAccountSummary.fulfilled, (state) => {
                state.allClientsLoading = false;
                state.allClientsError = null;
            })
            .addCase(refreshAccountSummary.rejected, (state, action) => {
                state.allClientsLoading = false;
                state.allClientsError = action.payload || "Failed to refresh account summary";
            })

            // Hide Clients
            .addCase(hideClients.pending, (state) => {
                state.hiddenClientsLoading = true;
                state.hiddenClientsError = null;
            })
            .addCase(hideClients.fulfilled, (state, action) => {
                state.hiddenClientsLoading = false;
                state.hiddenClients = Array.isArray(action.payload) ? action.payload : [];
                state.hiddenClientsError = null;
            })
            .addCase(hideClients.rejected, (state, action) => {
                state.hiddenClientsLoading = false;
                state.hiddenClientsError = action.payload || "Failed to hide clients";
            })

            // Unhide Clients
            .addCase(unhideClients.pending, (state) => {
                state.hiddenClientsLoading = true;
                state.hiddenClientsError = null;
            })
            .addCase(unhideClients.fulfilled, (state, action) => {
                state.hiddenClientsLoading = false;
                if (action.payload && Array.isArray(action.payload)) {
                    state.hiddenClients = state.hiddenClients.filter(
                        (client) => !action.payload.includes(client.clientId)
                    );
                }
                state.hiddenClientsError = null;
            })
            .addCase(unhideClients.rejected, (state, action) => {
                state.hiddenClientsLoading = false;
                state.hiddenClientsError = action.payload || "Failed to unhide clients";
            })

            // Get Hidden Clients
            .addCase(getHiddenClients.pending, (state) => {
                state.hiddenClientsLoading = true;
                state.hiddenClientsError = null;
            })
            .addCase(getHiddenClients.fulfilled, (state, action) => {
                state.hiddenClientsLoading = false;
                state.hiddenClients = Array.isArray(action.payload) ? action.payload : [];
                state.hiddenClientsError = null;
            })
            .addCase(getHiddenClients.rejected, (state, action) => {
                state.hiddenClientsLoading = false;
                state.hiddenClientsError = action.payload || "Failed to fetch hidden clients";
            })

            // Trigger Hourly Cron
            .addCase(triggerHourlyCron.pending, (state) => {
                state.cronLoading = true;
                state.cronError = null;
            })
            .addCase(triggerHourlyCron.fulfilled, (state) => {
                state.cronLoading = false;
                state.cronError = null;
            })
            .addCase(triggerHourlyCron.rejected, (state, action) => {
                state.cronLoading = false;
                state.cronError = action.payload || "Failed to trigger hourly cron";
            })

            // Get Cron Status
            .addCase(getCronStatus.pending, (state) => {
                state.cronLoading = true;
                state.cronError = null;
            })
            .addCase(getCronStatus.fulfilled, (state, action) => {
                state.cronLoading = false;
                state.cronStatus = action.payload;
                state.cronError = null;
            })
            .addCase(getCronStatus.rejected, (state, action) => {
                state.cronLoading = false;
                state.cronError = action.payload || "Failed to fetch cron status";
            })

            // Performance Report
            .addCase(fetchPerformanceReport.pending, (state) => {
                state.performanceReportLoading = true;
                state.performanceReportError = null;
            })
            .addCase(fetchPerformanceReport.fulfilled, (state, action) => {
                state.performanceReportLoading = false;
                state.performanceReport = action.payload.data;
                state.performanceReportError = null;
            })
            .addCase(fetchPerformanceReport.rejected, (state, action) => {
                state.performanceReportLoading = false;
                state.performanceReportError = action.payload || "Failed to fetch performance report";
            })

            // Performance Entities
            .addCase(fetchPerformanceEntities.pending, (state) => {
                state.performanceEntitiesLoading = true;
                state.performanceEntitiesError = null;
            })
            .addCase(fetchPerformanceEntities.fulfilled, (state, action) => {
                state.performanceEntitiesLoading = false;
                state.performanceEntities = action.payload.data;
                state.performanceEntitiesError = null;
            })
            .addCase(fetchPerformanceEntities.rejected, (state, action) => {
                state.performanceEntitiesLoading = false;
                state.performanceEntitiesError = action.payload || "Failed to fetch performance entities";
            });
    },
});

// Actions
export const {
    setDateRange,
    clearAllClientsData,
    clearSingleClientData,
    clearAccountSummaryData,
    clearAccountSummaryError,
    clearHiddenClientsError,
} = accountSummarySlice.actions;

// Selectors - Updated with separate loading states
export const selectAllClients = (state: RootStateWithAuth) =>
    state.accountSummary.allClients;

export const selectSingleClient = (state: RootStateWithAuth) =>
    state.accountSummary.singleClient;

export const selectAllClientsLoading = (state: RootStateWithAuth) =>
    state.accountSummary.allClientsLoading;

export const selectSingleClientLoading = (state: RootStateWithAuth) =>
    state.accountSummary.singleClientLoading;

export const selectAllClientsError = (state: RootStateWithAuth) =>
    state.accountSummary.allClientsError;

export const selectSingleClientError = (state: RootStateWithAuth) =>
    state.accountSummary.singleClientError;

export const selectAccountSummaryLastUpdated = (state: RootStateWithAuth) =>
    state.accountSummary.lastUpdated;

export const selectHiddenClients = (state: RootStateWithAuth) =>
    state.accountSummary.hiddenClients;

export const selectHiddenClientsLoading = (state: RootStateWithAuth) =>
    state.accountSummary.hiddenClientsLoading;

export const selectHiddenClientsError = (state: RootStateWithAuth) =>
    state.accountSummary.hiddenClientsError;

export const selectCronStatus = (state: RootStateWithAuth) =>
    state.accountSummary.cronStatus;

export const selectCronLoading = (state: RootStateWithAuth) =>
    state.accountSummary.cronLoading;

export const selectCronError = (state: RootStateWithAuth) =>
    state.accountSummary.cronError;

export const selectPerformanceReport = (state: RootStateWithAuth) =>
    state.accountSummary.performanceReport;

export const selectPerformanceReportLoading = (state: RootStateWithAuth) =>
    state.accountSummary.performanceReportLoading;

export const selectPerformanceReportError = (state: RootStateWithAuth) =>
    state.accountSummary.performanceReportError;

export const selectPerformanceEntities = (state: RootStateWithAuth) =>
    state.accountSummary.performanceEntities;

export const selectPerformanceEntitiesLoading = (state: RootStateWithAuth) =>
    state.accountSummary.performanceEntitiesLoading;

export const selectPerformanceEntitiesError = (state: RootStateWithAuth) =>
    state.accountSummary.performanceEntitiesError;

export const selectDateRange = (state: RootStateWithAuth) =>
    state.accountSummary.selectedDateRange;

// Export reducer
export default accountSummarySlice.reducer;