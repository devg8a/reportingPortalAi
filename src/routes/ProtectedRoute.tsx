import React, { memo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROUTES } from "./routes.constants";
import { selectIsAuthenticated, selectRequiresOtp, selectIsOtpVerified, selectToken } from "../redux/authSlice";
import DashboardLayout from "../layout/DashboardLayout";
import { LayoutProvider } from "../contexts/LayoutContext";

/**
 * Protected route wrapper (React Router v6).
 *
 * Redirect rules:
 * - If not authenticated => redirect to Login
 * - If authenticated     => allow access to nested protected routes
 */
const ProtectedRoute = memo(function ProtectedRoute(): React.ReactElement {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const requiresOtp = useSelector(selectRequiresOtp);
    const isOtpVerified = useSelector(selectIsOtpVerified);
    const location = useLocation();

    const currentPath = `${location.pathname}${location.search}`;

    // OTP pending (temp_token exists) => force Verify
    if (requiresOtp && !isOtpVerified && token) {
        return (
            <Navigate
                to={ROUTES.verify.path}
                replace
                state={{ from: currentPath }}
            />
        );
    }

    // No token => no session
    if (!isAuthenticated || !token) {
        return (
            <Navigate
                to={ROUTES.login.path}
                replace
                state={{ from: currentPath }}
            />
        );
    }

    // If 2FA is required but not verified, redirect to verify page
    if (requiresOtp && !isOtpVerified) {
        return (
            <Navigate
                to={ROUTES.verify.path}
                replace
                state={{ from: currentPath }}
            />
        );
    }

    // Keep the dashboard shell mounted for all protected pages.
    // DashboardLayout itself renders the <Outlet />.
    return (
        <LayoutProvider>
            <DashboardLayout />
        </LayoutProvider>
    );
});

export default ProtectedRoute;
