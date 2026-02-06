import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ApiCall } from "../helper/axios";
import { AuthState } from "./authSlice";
import { AxiosResponse } from "axios";

export interface Holiday {
    id?: string | number;
    date?: string;
    name?: string;
    [key: string]: any;
}

export interface Module {
    id?: string | number;
    name?: string;
    [key: string]: any;
}

export interface UserDataState {
    holidays: Holiday[];
    holidaysLoading: boolean;
    holidaysError: string | null;
    modules: Module[];
    modulesLoading: boolean;
    modulesError: string | null;
    modulesLoaded: boolean;
    activeModuleKey: string | null;
}

interface RootStateWithAuth {
    auth: AuthState;
    userData: UserDataState;
}

function isAxiosResponse<T = any>(
    res: unknown
): res is AxiosResponse<T> {
    return (
        typeof res === "object" &&
        res !== null &&
        "status" in res &&
        "data" in res
    );
}

// Async thunk for fetching holidays
export const fetchHolidays = createAsyncThunk<
    Holiday[],
    void,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "userData/fetchHolidays",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token;

            const response = await ApiCall("GET", "/api/holidays", "", {
                Authorization: token || ""
            });

            if (response && 'data' in response && response?.data) {
                return (response?.data as any)?.data?.holidays;
            } else {
                return rejectWithValue("Failed to fetch holidays");
            }
        } catch (error: any) {
            return rejectWithValue(error?.response?.data || error.message || "An error occurred");
        }
    }
);

// Async thunk for fetching modules
export const fetchModules = createAsyncThunk<
    Module[],
    void,
    { state: RootStateWithAuth; rejectValue: string }
>(
    "userData/fetchModules",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const token = auth?.token;

            const response = await ApiCall("GET", "/api/modules", "", {
                Authorization: token || ""
            });


            if (isAxiosResponse(response) && response.status === 200) {
                return response.data?.data;
            } else {
                return rejectWithValue("Failed to fetch modules");
            }
        } catch (error: any) {
            console.log("Modules API Error:", error);
            return rejectWithValue(error?.response?.data || error.message || "An error occurred");
        }
    }
);

const initialState: UserDataState = {
    holidays: [],
    holidaysLoading: false,
    holidaysError: null,
    modules: [],
    modulesLoading: false,
    modulesError: null,
    modulesLoaded: false,
    activeModuleKey: null,
};

const userDataSlice = createSlice({
    name: "userData",
    initialState,
    reducers: {
        clearHolidaysError: (state) => {
            state.holidaysError = null;
        },
        clearHolidaysData: (state) => {
            state.holidays = [];
            state.holidaysError = null;
        },
        setActiveModuleKey: (state, action: PayloadAction<string | null>) => {
            state.activeModuleKey = action.payload;
        },
        clearActiveModuleKey: (state) => {
            state.activeModuleKey = null;
        },
        removeModuleByKeySafe: (
            state,
            action: PayloadAction<string | undefined>
          ) => {
            const keyToUpdate = action.payload;
            if (!keyToUpdate) return;
          
            const updateRecursively = (modules: Module[]) => {
              modules.forEach(module => {
                // case 1: exact match → access false
                if (module.key === keyToUpdate) {
                  if (!module.permissions) {
                    module.permissions = { access: false };
                  } else {
                    module.permissions.access = false;
                  }
                }
          
                // traverse children
                if (module.sub_modules?.length) {
                  updateRecursively(module.sub_modules);
          
                  // case 2: parent but all children inactive → parent access false
                  if (
                    module.is_parent &&
                    module.sub_modules.every(
                      child => child.permissions?.access === false
                    )
                  ) {
                    if (!module.permissions) {
                      module.permissions = { access: false };
                    } else {
                      module.permissions.access = false;
                    }
                  }
                }
              });
            };
          
            updateRecursively(state.modules);
          },  
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchHolidays.pending, (state) => {
                state.holidaysLoading = true;
                state.holidaysError = null;
            })
            .addCase(fetchHolidays.fulfilled, (state, action: PayloadAction<Holiday[]>) => {
                state.holidaysLoading = false;
                state.holidays = action.payload;
                state.holidaysError = null;
            })
            .addCase(fetchHolidays.rejected, (state, action) => {
                state.holidaysLoading = false;
                state.holidaysError = action.payload || null;
            })
            .addCase(fetchModules.pending, (state) => {
                state.modulesLoading = true;
                state.modulesError = null;
                state.modulesLoaded = false;
            })
            .addCase(fetchModules.fulfilled, (state, action: PayloadAction<Module[]>) => {
                state.modulesLoading = false;
                state.modules = action.payload;
                state.modulesError = null;
                state.modulesLoaded = true;
            })
            .addCase(fetchModules.rejected, (state, action) => {
                state.modulesLoading = false;
                state.modulesError = action.payload || null;
                state.modulesLoaded = false;
            });
    },
});

export const { clearHolidaysError, clearHolidaysData, setActiveModuleKey, clearActiveModuleKey, removeModuleByKeySafe  } = userDataSlice.actions;

// Selectors
export const selectHolidays = (state: RootStateWithAuth) => state.userData.holidays;
export const selectHolidaysLoading = (state: RootStateWithAuth) => state.userData.holidaysLoading;
export const selectHolidaysError = (state: RootStateWithAuth) => state.userData.holidaysError;

export const selectModules = (state: RootStateWithAuth) => state.userData.modules;
export const selectModulesLoading = (state: RootStateWithAuth) => state.userData.modulesLoading;
export const selectModulesError = (state: RootStateWithAuth) => state.userData.modulesError;
export const selectModulesLoaded = (state: RootStateWithAuth) => state.userData.modulesLoaded;
export const selectActiveModuleKey = (state: RootStateWithAuth) => state.userData.activeModuleKey;

export default userDataSlice.reducer;
