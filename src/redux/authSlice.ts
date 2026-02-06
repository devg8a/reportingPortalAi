import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "V2_ReportingPortal";

export interface User {
    id?: string | number;
    email?: string;
    name?: string;
    role?: string;
    [key: string]: any;
}

export interface Permissions {
    [key: string]: any;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    permissions: Permissions | null;
    isOtpVerified: boolean;
    requiresOtp: boolean;
    otpEntityType: string | null;
    otpUserId: string | number | null;
}

function loadAuthFromStorage(): AuthState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed as AuthState;
    } catch {
        return null;
    }
}

export function saveAuthToStorage(authState: AuthState): void {
    try {
        // Persist only what we need.
        const payload = {
            // Token is the real source of truth for an authenticated session.
            isAuthenticated: Boolean(authState?.token),
            user: authState?.user ?? null,
            token: authState?.token ?? null,
            permissions: authState?.permissions ?? null,
            isOtpVerified: Boolean(authState?.isOtpVerified),
            requiresOtp: Boolean(authState?.requiresOtp),
            // For 2FA pending flow
            otpEntityType: authState?.otpEntityType ?? null,
            otpUserId: authState?.otpUserId ?? null,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Ignore write errors (e.g., storage full, blocked, etc.)
    }
}

export function clearAuthFromStorage(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
}

const persisted = loadAuthFromStorage();

const initialState: AuthState = {
    // Token is the real source of truth for an authenticated session.
    isAuthenticated: Boolean(persisted?.token),
    user: persisted?.user ?? null,
    token: persisted?.token ?? null,
    permissions: persisted?.permissions ?? null,
    isOtpVerified: Boolean(persisted?.isOtpVerified),
    requiresOtp: Boolean(persisted?.requiresOtp),
    // For 2FA pending flow
    otpEntityType: persisted?.otpEntityType ?? null,
    otpUserId: persisted?.otpUserId ?? null,
};

interface LoginSuccessPayload {
    user?: User;
    token?: string;
    permissions?: Permissions;
    requiresOtp?: boolean;
}

interface LoginOtpPendingPayload {
    token?: string;
    otpEntityType?: string;
    otpUserId?: string | number;
}

interface OtpLoginSuccessPayload {
    user?: User;
    token?: string;
    permissions?: Permissions;
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        /**
         * Call this after a successful login API response.
         * Keep reducers pure: persistence is handled by the store subscriber.
         */
        loginSuccess: (state, action: PayloadAction<LoginSuccessPayload>) => {
            const { user, token, permissions, requiresOtp } = action.payload || {};
            state.user = user ?? null;
            state.token = token ?? null;
            state.isAuthenticated = Boolean(token);
            state.permissions = permissions ?? null;
            state.requiresOtp = Boolean(requiresOtp);
            // Reset OTP verification state on new login
            state.isOtpVerified = false;
            // Clear OTP pending state if any
            state.otpEntityType = null;
            state.otpUserId = null;
        },
        /**
         * Login response for 2FA enabled users (no user/token yet, only temp_token).
         */
        loginOtpPending: (state, action: PayloadAction<LoginOtpPendingPayload>) => {
            const { token, otpEntityType, otpUserId } = action.payload || {};
            state.isAuthenticated = false;
            state.user = null;
            state.token = token ?? null;
            state.permissions = null;
            state.requiresOtp = true;
            state.isOtpVerified = false;
            state.otpEntityType = otpEntityType ?? null;
            state.otpUserId = otpUserId ?? null;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.permissions = null;
            state.isOtpVerified = false;
            state.requiresOtp = false;
            state.otpEntityType = null;
            state.otpUserId = null;
        },
        verifyOtpSuccess: (state) => {
            state.isOtpVerified = true;
        },
        /**
         * OTP verified -> backend returns real session token/user.
         */
        otpLoginSuccess: (state, action: PayloadAction<OtpLoginSuccessPayload>) => {
            const { user, token, permissions } = action.payload || {};
            state.user = user ?? null;
            state.token = token ?? null;
            state.permissions = permissions ?? null;
            state.isAuthenticated = Boolean(token);
            state.requiresOtp = false;
            state.isOtpVerified = true;
            state.otpEntityType = null;
            state.otpUserId = null;
        },
    },
});

export const { loginSuccess, loginOtpPending, logout, verifyOtpSuccess, otpLoginSuccess } = authSlice.actions;

// Selectors - using RootState type from store
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectIsOtpVerified = (state: { auth: AuthState }) => state.auth.isOtpVerified;
export const selectRequiresOtp = (state: { auth: AuthState }) => state.auth.requiresOtp;
export const selectOtpEntityType = (state: { auth: AuthState }) => state.auth.otpEntityType;
export const selectOtpUserId = (state: { auth: AuthState }) => state.auth.otpUserId;

export default authSlice.reducer;
