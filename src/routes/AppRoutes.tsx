import React, { memo } from "react";
import { Navigate, Route, Routes, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

import { ROUTES } from "./routes.constants";
import ProtectedRoute from "./ProtectedRoute";
import {
    selectIsAuthenticated,
    selectIsOtpVerified,
    selectRequiresOtp,
    selectToken,
} from "../redux/authSlice";

import Profile from "../pages/Profile";
import ActiveClientList from "../pages/ActiveClientList";
import AccountSummary from "../pages/AccountSummary";
import AccountPerformance from "../pages/AccountPerformance";
import LtvReport from "../pages/LtvReport";
import UserList from "../pages/UserList";
import RolesPermission from "../pages/RolesPermission";
import CreateRoleModal from "../common_components/CreateRoleModal";
import Home from "../pages/Home";
import Favorites from "../pages/Favorites";
import Settings from "../pages/Settings";
import Login from "../pages/auth/Login";
import ResetPassword from "../pages/auth/ResetPassword";
import ForgotPassword from "../pages/auth/ForgotPassword";
import Verify from "../pages/auth/Verify";
import ActiveClient from "../pages/ActiveClient";
import AccountSummaryMain from "../pages/AccountSummary/AccountSummaryMain";
import ClientList from "../pages/ClientList";
import NotFound from "../pages/NotFound";
import ProTeamLeaguePerformance from "../pages/AccountSummary/ProTeamLeaguePerformance";
import EmailMarketing from "../pages/EmailMarketing";

/**
 * Public-only wrapper:
 * - If authenticated => block access to login/register and redirect to the default protected page
 * - Else => allow access
 */
const PublicOnlyRoute = memo(function PublicOnlyRoute(): React.ReactElement {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const requiresOtp = useSelector(selectRequiresOtp);
    const isOtpVerified = useSelector(selectIsOtpVerified);

    // If OTP is pending (temp_token exists), force user to Verify (even though no real token yet)
    if (requiresOtp && !isOtpVerified && token) {
        return <Navigate to={ROUTES.verify.path} replace />;
    }

    // If we don't have a real token/session, treat as logged out and allow public pages
    if (!isAuthenticated || !token) {
        return <Outlet />;
    }

    // 2FA pending users should be forced to Verify (not dashboard)
    if (requiresOtp && !isOtpVerified) {
        return <Navigate to={ROUTES.verify.path} replace />;
    }

    // Normal authenticated users go to default protected page
    return <Navigate to={ROUTES.accountSummary.path} replace />;
});

/**
 * Verify-only wrapper:
 * - Must be authenticated (token exists)
 * - Must require OTP
 * - Must NOT be already verified
 *
 * Otherwise redirect away to Login or default protected page.
 */
const VerifyOnlyRoute = memo(function VerifyOnlyRoute(): React.ReactElement {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const requiresOtp = useSelector(selectRequiresOtp);
    const isOtpVerified = useSelector(selectIsOtpVerified);

    // OTP verify is allowed with either real token OR temp_token
    if (!requiresOtp) {
        return <Navigate to={ROUTES.accountSummary.path} replace />;
    }

    if (isOtpVerified) {
        return <Navigate to={ROUTES.accountSummary.path} replace />;
    }

    // No token and no temp_token => force login
    if ((!isAuthenticated || !token) && !token) {
        return <Navigate to={ROUTES.login.path} replace />;
    }

    return <Outlet />;
});

const AppRoutes = memo(function AppRoutes(): React.ReactElement {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const hasSession = Boolean(isAuthenticated && token);
    const requiresOtp = useSelector(selectRequiresOtp);
    const isOtpVerified = useSelector(selectIsOtpVerified);
    const hasOtpPending = Boolean(requiresOtp && !isOtpVerified && token);

    return (
        <Routes>
            {/* Root: always redirect based on auth */}
            <Route
                path={ROUTES.root.path}
                element={
                    <Navigate
                        to={hasOtpPending ? ROUTES.verify.path : hasSession ? ROUTES.accountSummary.path : ROUTES.login.path}
                        replace
                    />
                }
            />

            {/* Public routes (blocked when authenticated) */}
            <Route element={<PublicOnlyRoute />}>
                <Route path={ROUTES.login.path} element={<Login />} />
                <Route path={ROUTES.resetPassword.path} element={<ResetPassword />} />
                <Route path={ROUTES.forgotPassword.path} element={<ForgotPassword />} />
            </Route>

            {/* 2FA Verify route (token required) */}
            <Route element={<VerifyOnlyRoute />}>
                <Route path={ROUTES.verify.path} element={<Verify />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
                {/* Legacy entry route */}

                {/* Icon rail pages */}
                <Route path={ROUTES.home.path} element={<Home />} />
                <Route path={ROUTES.favorites.path} element={<Favorites />} />
                <Route path={ROUTES.settings.path} element={<Settings />} />

                {/* Static Menu pages - Management (keep for backward compatibility) */}
                <Route path={ROUTES.activeClientList.path} element={<ActiveClientList />} />
                {/* <Route path={ROUTES.accountSummary.path} element={<AccountSummary />} /> */}
                <Route path={ROUTES.accountSummary.path} element={<AccountSummaryMain />} />

                <Route path={ROUTES.accountPerformance.path} element={<AccountPerformance />} />
                <Route path={ROUTES.ltvReport.path} element={<LtvReport />} />

                {/* Static Menu pages - User Management */}
                <Route path={ROUTES.userList.path} element={<UserList />} />
                <Route path={ROUTES.rolesPermission.path} element={<RolesPermission />} />
                <Route path={ROUTES.rolePermissionCreate.path} element={<CreateRoleModal />} />
                <Route path={ROUTES.rolePermissionEdit.path} element={<CreateRoleModal />} />
                <Route path={ROUTES.activeClient.path} element={<ActiveClient />} />
                <Route path={ROUTES.clients.path} element={<ClientList />} />

                {/* Other protected routes */}
                <Route path={ROUTES.profile.path} element={<Profile />} />

                <Route path={ROUTES.proTeamLeaguePerformance.path} element={<ProTeamLeaguePerformance />} />
                <Route path={ROUTES.emailMarketing.path} element={<EmailMarketing />} />

                {/* NotFound page (for 403 errors) */}
                <Route path={ROUTES.notFound.path} element={<NotFound />} />

            </Route>

            {/* Fallback */}
            <Route
                path="*"
                element={<Navigate to={ROUTES.root.path} replace />}
            />
        </Routes>
    );
});

export default AppRoutes;
