import React, { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import DashboardHeader, { DASHBOARD_HEADER_HEIGHT } from "./DashboardHeader";
import DashboardSidebar, {
    DASHBOARD_ICON_RAIL_WIDTH,
    DASHBOARD_SIDEBAR_WIDTH,
} from "./DashboardSidebar";
import { useLayout } from "../contexts/LayoutContext";
import { fetchModules, selectModulesLoaded, selectModulesLoading } from "../redux/userDataSlice";
import { selectIsAuthenticated, selectToken } from "../redux/authSlice";
import { AppDispatch } from "../redux/store";
import CommonLoader from "../common_components/CommonLoader";

/**
 * Dashboard shell (sidebar + header) which stays mounted for all protected pages.
 * Only the center `<Outlet />` content changes on navigation (no blink).
 *
 * Sizing derived from Figma:
 * - Header height: 70
 * - Icon rail: 60
 * - Expanded menu panel: 275 (total left = 335)
 */
export default function DashboardLayout(): React.ReactElement {
    const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
    const { isSidebarVisible } = useLayout();
    const dispatch = useDispatch<AppDispatch>();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const isLoadingMenu = useSelector(selectModulesLoading)
    const modulesLoaded = useSelector(selectModulesLoaded);
    const modulesLoading = useSelector(selectModulesLoading);

    // Fetch modules only once on mount when authenticated, not on every navigation
    const modulesFetchedRef = React.useRef<boolean>(false);

    useEffect(() => {
        if (isAuthenticated && token && !modulesFetchedRef.current) {
            dispatch(fetchModules());
            modulesFetchedRef.current = true;
        }
        // Reset when user logs out
        if (!isAuthenticated || !token) {
            modulesFetchedRef.current = false;
        }
    }, [dispatch, isAuthenticated, token]);

    const toggleSidebar = useCallback((): void => {
        setIsSidebarExpanded((v) => !v);
    }, []);

    const leftOffset = !isSidebarVisible
        ? 0
        : isSidebarExpanded
            ? DASHBOARD_ICON_RAIL_WIDTH + DASHBOARD_SIDEBAR_WIDTH
            : DASHBOARD_ICON_RAIL_WIDTH;

    return (
        <>
            {isLoadingMenu ? <CommonLoader /> : <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
                {isSidebarVisible && (
                    <>
                        <DashboardHeader
                            isSidebarExpanded={isSidebarExpanded}
                            onToggleSidebar={toggleSidebar}
                        />

                        <DashboardSidebar
                            isExpanded={isSidebarExpanded}
                            onToggleExpanded={toggleSidebar}
                        />
                    </>
                )}

                {/* Main content area */}
                <Box className="content-container"
                    sx={{
                        flex: 1,
                        ml: `${leftOffset}px`,
                        pt: isSidebarVisible ? `${DASHBOARD_HEADER_HEIGHT}px` : 0,
                        minWidth: 0,
                    }}
                >
                    <div className="main-container-body">
                        {/* After login: modules must load successfully before any page mounts (so no page APIs fire early). */}
                        {isAuthenticated && token && (!modulesLoaded || modulesLoading) ? (
                            <Box
                                sx={{
                                    minHeight: "calc(100vh - 200px)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <CircularProgress sx={{ color: "#d10075" }} />
                            </Box>
                        ) : (
                            <Outlet />
                        )}
                    </div>
                </Box>
            </Box>}
        </>
    );
}
