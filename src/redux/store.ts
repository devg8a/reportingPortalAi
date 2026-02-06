import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
    clearAuthFromStorage,
    saveAuthToStorage,
    AuthState,
} from "./authSlice";
import userDataReducer, { UserDataState } from "./userDataSlice";
import permissionsReducer, { PermissionsState } from "./permissionsSlice";
import accountSummaryReducer, { AccountSummaryState } from "./accountSummarySlice";
import utilityReducer, { UtilityState } from "./utilitySlice";

export interface RootState {
    auth: AuthState;
    userData: UserDataState;
    permissions: PermissionsState;
    accountSummary: AccountSummaryState;
    utility: UtilityState;
}

export const store = configureStore({
    reducer: {
        auth: authReducer,
        userData: userDataReducer,
        permissions: permissionsReducer,
        accountSummary: accountSummaryReducer,
        utility: utilityReducer,
    },
});

export type AppDispatch = typeof store.dispatch;

/**
 * Persist auth state to localStorage.
 * - Keeps reducers pure (best practice).
 * - Centralizes persistence in one place.
 */
let lastAuthSnapshot = store.getState().auth;
store.subscribe(() => {
    const nextAuth = store.getState().auth;

    // Avoid extra writes when state hasn't changed.
    if (nextAuth === lastAuthSnapshot) return;
    lastAuthSnapshot = nextAuth;

    /**
     * Persist rules:
     * - If user has a real session token => persist
     * - If user is in 2FA pending state (tempToken exists) => persist (so /verify refresh works)
     * - Else => clear
     */
    const hasRealSession = Boolean(nextAuth?.isAuthenticated && nextAuth?.token);
    const hasOtpPending = Boolean(nextAuth?.requiresOtp && !nextAuth?.isOtpVerified && nextAuth?.token);

    if (!hasRealSession && !hasOtpPending) {
        clearAuthFromStorage();
        return;
    }

    saveAuthToStorage(nextAuth);
});
