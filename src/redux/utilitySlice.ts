import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { utilityService, Client, ActiveClientsResponse } from "../services/utility.service";

/**
 * State interface
 */
export interface UtilityState {
    activeClients: Client[];
    loading: boolean;
    error: string | null;
}

/**
 * Initial state
 */
const initialState: UtilityState = {
    activeClients: [],
    loading: false,
    error: null,
};

/**
 * Async thunk: Fetch active clients
 */
export const fetchActiveClients = createAsyncThunk<
    Client[],        // return type
    string           // argument type
>(
    "utility/fetchActiveClients",
    async (token, { rejectWithValue }) => {
        try {
            const response = await utilityService.getActiveClients(token);
            return response.data;   // <-- ONLY ARRAY return karna!
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

/**
 * Utility Slice
 */
const utilitySlice = createSlice({
    name: "utility",
    initialState,
    reducers: {
        clearActiveClients: (state) => {
            state.activeClients = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch active clients
            .addCase(fetchActiveClients.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchActiveClients.fulfilled, (state, action: PayloadAction<Client[]>) => {
                state.loading = false;
                state.activeClients = action.payload;
            })

            .addCase(fetchActiveClients.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Actions
export const { clearActiveClients } = utilitySlice.actions;

// Selectors
export const selectActiveClients = (state: RootState) => state.utility.activeClients;
export const selectUtilityLoading = (state: RootState) => state.utility.loading;
export const selectUtilityError = (state: RootState) => state.utility.error;

export default utilitySlice.reducer;
