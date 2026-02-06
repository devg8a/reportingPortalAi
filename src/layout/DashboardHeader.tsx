import React, { memo } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import {
    DASHBOARD_ICON_RAIL_WIDTH,
    DASHBOARD_SIDEBAR_WIDTH,
} from "./DashboardSidebar";
import { getActivePageLabel } from "./getActivePageLabel";
import { selectModules } from "../redux/userDataSlice";
import SvgIcon from "@mui/material/SvgIcon";

export const DASHBOARD_HEADER_HEIGHT = 70;

interface DashboardHeaderProps {
    isSidebarExpanded: boolean;
    onToggleSidebar: () => void;
}

/**
 * Fixed dashboard header from Figma:
 * - Left header block aligns with sidebar area (335px when expanded)
 * - Right block shows back arrow + page title + avatar
 */
function DashboardHeader({ isSidebarExpanded, onToggleSidebar }: DashboardHeaderProps): React.ReactElement {
    const location = useLocation();
    const modules = useSelector(selectModules);
    const pageTitle = getActivePageLabel(location.pathname, modules);
    // Keep header alignment stable even when the sidebar menu panel is collapsed.
    // This prevents the logo from overlapping the "Account Overview" block.

    return (
        <AppBar
            className="top-header-container"
            position="fixed"
            elevation={0}
            sx={{
                height: DASHBOARD_HEADER_HEIGHT,
                bgcolor: "background.paper",
                borderBottom: 1,
                borderColor: "divider",
                zIndex: (t) => t.zIndex.drawer + 1,
            }}
        >
            <Toolbar
                disableGutters
                sx={{
                    // height: DASHBOARD_HEADER_HEIGHT,
                }}
            >
                <Box className={`header-grid ${!isSidebarExpanded && 'header-collapse'} dashboard-header-container`}
                    sx={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: `${isSidebarExpanded ? `363px` : '60px'} 1fr`,
                        alignItems: "center",
                    }}
                >
                    {/* Left block (logo + collapse control) */}
                    <Box

                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: `${isSidebarExpanded ? `space-between` : 'center'}`,
                            pr: '0',
                            p: `${isSidebarExpanded ? `19px 20px` : '0'}`,
                            width: '100%',
                            borderRight: '1px solid #F4F4F5',
                            overflow: "hidden",
                            height: '100%'
                        }}
                    >
                        <Box sx={{ p: '0' }}>
                            <Box sx={{ maxWidth: `${isSidebarExpanded ? '124px' : '60px'}`, height: 32, width: '100%', }}>
                                <Box
                                    component="img"
                                    src={`${isSidebarExpanded ? '/assets/logo-group8a.svg' : '/assets/collpase-logo.svg'}`}
                                    alt="GROUP 8A"
                                    sx={{ height: '100%', width: "100%", display: "block" }}
                                />

                            </Box>
                        </Box>

                        {/* <IconButton
              onClick={onToggleSidebar}
              size="small"
              aria-label="Toggle sidebar"
              disableRipple
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                color: "text.secondary",
              }}
            >
              <SvgIcon
                viewBox="0 0 24 24"
                sx={{
                  width: 24,
                  height: 24,
                  transform: isSidebarExpanded ? "none" : "scaleX(-1)",
                }}
              >
                <path d="M16.5886 8.9634C16.8815 8.67051 16.8815 8.19564 16.5886 7.90274C16.2957 7.60985 15.8208 7.60985 15.5279 7.90275L16.0583 8.43308L16.5886 8.9634ZM12.4436 12.0478L11.9133 11.5175C11.6204 11.8103 11.6204 12.2852 11.9133 12.5781L12.4436 12.0478ZM15.5279 16.1928C15.8208 16.4857 16.2957 16.4857 16.5886 16.1928C16.8815 15.8999 16.8815 15.425 16.5886 15.1321L16.0583 15.6625L15.5279 16.1928ZM21.0019 6.59889H20.2519V17.4011H21.0019H21.7519V6.59889H21.0019ZM2.99811 9.49908H3.74811V6.59889H2.99811H2.24811V9.49908H2.99811ZM2.99811 17.4011H3.74811V14.501H2.99811H2.24811V17.4011H2.99811ZM7.49905 21.0019V20.2519H6.59886V21.0019V21.7519H7.49905V21.0019ZM6.59886 2.99814V3.74814H7.49905V2.99814V2.24814H6.59886V2.99814ZM7.49905 2.99814H6.74905V21.0019H7.49905H8.24905V2.99814H7.49905ZM2.99811 17.4011H2.24811C2.24811 19.804 4.196 21.7519 6.59886 21.7519V21.0019V20.2519C5.02443 20.2519 3.74811 18.9756 3.74811 17.4011H2.99811ZM21.0019 17.4011H20.2519C20.2519 18.9756 18.9755 20.2519 17.4011 20.2519V21.0019V21.7519C19.804 21.7519 21.7519 19.804 21.7519 17.4011H21.0019ZM21.0019 6.59889H21.7519C21.7519 4.19604 19.804 2.24814 17.4011 2.24814V2.99814V3.74814C18.9755 3.74814 20.2519 5.02446 20.2519 6.59889H21.0019ZM2.99811 6.59889H3.74811C3.74811 5.02446 5.02443 3.74814 6.59886 3.74814V2.99814V2.24814C4.196 2.24814 2.24811 4.19603 2.24811 6.59889H2.99811ZM16.0583 8.43308L15.5279 7.90275L11.9133 11.5175L12.4436 12.0478L12.9739 12.5781L16.5886 8.9634L16.0583 8.43308ZM12.4436 12.0478L11.9133 12.5781L15.5279 16.1928L16.0583 15.6625L16.5886 15.1321L12.9739 11.5175L12.4436 12.0478ZM7.49905 2.99814V3.74814H17.4011V2.99814V2.24814H7.49905V2.99814ZM17.4011 21.0019V20.2519H7.49905V21.0019V21.7519H17.4011V21.0019Z" fill="#71717A" />
              </SvgIcon>
            </IconButton> */}
                    </Box>

                    {/* Right block (back + title + avatar) */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0, py: 2, px: 2.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                            <IconButton size="small" aria-label="Back" disabled disableRipple>
                                <SvgIcon
                                    viewBox="0 0 24 24"
                                    sx={{
                                        width: 24,
                                        height: 24,
                                    }}
                                >
                                    <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </SvgIcon>
                            </IconButton>
                            <Divider orientation="vertical" flexItem />
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600, color: '#000', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                            >
                                {pageTitle}
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1 }} />
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default memo(DashboardHeader);
