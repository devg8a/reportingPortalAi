import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import { Link as RouterLink, useLocation } from "react-router-dom";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import SvgIcon from "@mui/material/SvgIcon";
import { useDispatch, useSelector } from "react-redux";

import NavItem from "../common_components/NavItem";
import MenuItemWithChildren from "./MenuItemWithChildren";
import { SIDEBAR_RAIL } from "./sidebarRail.config";
import { DASHBOARD_HEADER_HEIGHT } from "./DashboardHeader";
import { logout, selectUser } from "../redux/authSlice";
import { clearActiveModuleKey, selectModules, selectModulesLoaded, setActiveModuleKey } from "../redux/userDataSlice";
import { transformModulesToMenu, MenuItemTransformed } from "../utils/menuTransformer";
import { AppDispatch } from "../redux/store";
import { ROUTES } from "../routes/routes.constants";

export const DASHBOARD_ICON_RAIL_WIDTH = 60;
export const DASHBOARD_SIDEBAR_WIDTH = 303;

interface DashboardSidebarProps {
    isExpanded: boolean;
    onToggleExpanded: () => void;
}

/**
 * Two-part sidebar to match Figma:
 * - Left icon rail (60px) always visible
 * - Right menu panel (275px) collapsible
 */
function DashboardSidebar({ isExpanded, onToggleExpanded }: DashboardSidebarProps): React.ReactElement {
    const [logoutLoaderStatus, setLogoutLoaderStatus] = useState<boolean>(false);
    const location = useLocation();
    const pathname = location.pathname;
    const dispatch = useDispatch<AppDispatch>();
    const logoutRef = useRef<HTMLDivElement>(null);
    const user = useSelector(selectUser);
    const modules = useSelector(selectModules);
    const modulesLoaded = useSelector(selectModulesLoaded);

    // Transform modules to menu structure
    const dynamicMenu = useMemo(() => {
        return transformModulesToMenu(modules);
    }, [modules]);
    console.log(dynamicMenu)

    // Helper function to check if pathname matches roles permission routes
    const isRolesPermissionRoute = useCallback((path: string): boolean => {
        // Extract base path from edit route (remove :id parameter)
        const editRouteBase = ROUTES.rolePermissionEdit.path.replace('/:id', '');
        return path === ROUTES.rolesPermission.path || 
               path.startsWith(ROUTES.rolePermissionCreate.path) || 
               path.startsWith(editRouteBase + '/');
    }, []);
    
    // Helper function to check if any item in a group or its children is active
    const checkIfGroupHasActiveItem = useCallback((group: MenuItemTransformed): boolean => {
        const checkItem = (item: MenuItemTransformed): boolean => {
            if (item.to === pathname) return true;
            // Special handling for roles permission routes
            if (item.to === ROUTES.rolesPermission.path && isRolesPermissionRoute(pathname)) {
                return true;
            }
            if (item.items && item.items.length > 0) {
                return item.items.some(checkItem);
            }
            return false;
        };
        return checkItem(group);
    }, [pathname, isRolesPermissionRoute]);

    // State to manage which sections are expanded
    // Only expand if a child is active, otherwise keep closed
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        dynamicMenu.forEach((group) => {
            // Only expand if group has active item
            const checkItem = (item: MenuItemTransformed): boolean => {
                if (item.to === pathname) return true;
                if (item.items && item.items.length > 0) {
                    return item.items.some(checkItem);
                }
                return false;
            };
            initial[group.key] = checkItem(group);
        });
        return initial;
    });

    // Update expanded sections when menu or pathname changes
    useEffect(() => {
        setExpandedSections((prev) => {
            const updated = { ...prev };
            dynamicMenu.forEach((group) => {
                // Only expand if group has active item
                const hasActive = checkIfGroupHasActiveItem(group);
                if (hasActive) {
                    updated[group.key] = true;
                } else if (!(group.key in updated)) {
                    // If not in state yet, set to false (closed)
                    updated[group.key] = false;
                }
                // Don't auto-collapse if user manually expanded it
            });
            return updated;
        });
    }, [dynamicMenu, pathname, checkIfGroupHasActiveItem]);

    // Toggle section expand/collapse
    const toggleSection = (sectionKey: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    };

    // "Menu section" is active when the current route matches any menu item.
    const isOnMenuPage = useMemo(() => {
        return dynamicMenu.some((group) => checkIfGroupHasActiveItem(group));
    }, [pathname, dynamicMenu, checkIfGroupHasActiveItem]);

    /**
     * Keep `activeModuleKey` in Redux in sync with the currently active sidebar module.
     * - Uses module data returned from `/api/modules` (dynamicMenu keys), not hardcoded values.
     * - This also covers refresh/direct navigation (module stays highlighted in sidebar based on current route).
     */
    useEffect(() => {
        if (!modulesLoaded || !dynamicMenu || dynamicMenu.length === 0) {
            return;
        }

        // Special case: If pathname is a roles permission route (including edit/create),
        // find the roles & permissions module key
        if (isRolesPermissionRoute(pathname)) {
            const findRolesPermissionKey = (items: MenuItemTransformed[]): string | null => {
                for (const item of items) {
                    if (item.to === ROUTES.rolesPermission.path) {
                        return item.key;
                    }
                    if (item.items && item.items.length > 0) {
                        const found = findRolesPermissionKey(item.items);
                        if (found) return found;
                    }
                }
                return null;
            };

            // Search in all groups and their children
            for (const group of dynamicMenu) {
                if (group.to === ROUTES.rolesPermission.path) {
                    dispatch(setActiveModuleKey(group.key));
                    return;
                }
                if (group.items && group.items.length > 0) {
                    const found = findRolesPermissionKey(group.items);
                    if (found) {
                        dispatch(setActiveModuleKey(found));
                        return;
                    }
                }
            }
            // If not found, still try to clear (shouldn't happen, but safe fallback)
            dispatch(clearActiveModuleKey());
            return;
        }

        // Normal matching for other routes
        const matchesItem = (item: MenuItemTransformed): boolean => {
            if (item.to === pathname) return true;
            return false;
        };

        const findActiveKeyInItems = (items: MenuItemTransformed[]): string | null => {
            for (const item of items) {
                if (matchesItem(item)) return item.key;
                if (item.items && item.items.length > 0) {
                    const found = findActiveKeyInItems(item.items);
                    if (found) return found;
                }
            }
            return null;
        };

        // Search through all menu groups and children
        let activeKey: string | null = null;
        for (const group of dynamicMenu) {
            if (matchesItem(group)) {
                activeKey = group.key;
                break;
            }
            if (group.items && group.items.length > 0) {
                const found = findActiveKeyInItems(group.items);
                if (found) {
                    activeKey = found;
                    break;
                }
            }
        }

        if (activeKey) {
            dispatch(setActiveModuleKey(activeKey));
        } else {
            // Not inside a module page (e.g. profile/rail pages) => clear so axios won't send module_key
            dispatch(clearActiveModuleKey());
        }
    }, [dispatch, dynamicMenu, isRolesPermissionRoute, modulesLoaded, pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                logoutRef.current &&
                !logoutRef.current.contains(event.target as Node)
            ) {
                setLogoutLoaderStatus(false); // close popup
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <>
            {/* Icon rail */}
            <Drawer
                variant="permanent"
                PaperProps={{
                    sx: {
                        width: DASHBOARD_ICON_RAIL_WIDTH,
                        overflowX: "hidden",
                        mt: `${DASHBOARD_HEADER_HEIGHT}px`,
                        height: `calc(100% - ${DASHBOARD_HEADER_HEIGHT}px)`,
                        borderRight: 1,
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        zIndex: "99"
                    },
                }}
            >
                <Stack
                    sx={{
                        height: "100%",
                        alignItems: "center",
                        py: 1.5,
                    }}
                    spacing={2}
                >
                    <Stack spacing={1} sx={{ alignItems: "center" }} className="dashboard-sidebar-container">
                        {SIDEBAR_RAIL.map(({ key, icon: Icon, label, to }) => {
                            const isMenuToggle = key === "menu";
                            const isActive = Boolean(
                                (to && pathname === to) || (isMenuToggle && isOnMenuPage)
                            );

                            // Correctly pass props to SvgIcon component
                            const button = (
                                <IconButton
                                    key={key}
                                    size="large"
                                    aria-label={label}
                                    component={to ? RouterLink : "button"}
                                    to={to || undefined}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2,
                                        bgcolor: isActive ? "primary.50" : "transparent",
                                        color: isActive ? "primary.main" : "text.secondary",
                                    }}
                                    onClick={isMenuToggle ? onToggleExpanded : undefined}
                                    className={`${isActive && 'is-active'}`}
                                >
                                    <Icon fontSize="small" />
                                </IconButton>
                            );

                            return (
                                <Tooltip key={key} title={label} placement="right">
                                    {button}
                                </Tooltip>
                            );
                        })}
                    </Stack>

                    <div className="group-logout-main-container" onClick={() => setLogoutLoaderStatus((prev) => !prev)}>
                        <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 19V17C17 15.9391 16.5786 14.9217 15.8284 14.1716C15.0783 13.4214 14.0609 13 13 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M13 5C13 7.20914 11.2091 9 9 9C6.79086 9 5 7.20914 5 5C5 2.79086 6.79086 1 9 1C11.2091 1 13 2.79086 13 5Z" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="active-dots"></div>
                    </div>
                </Stack>
            </Drawer>

            {/* Menu panel */}
            <Drawer
                className={isExpanded ? 'expanded-drawer' : 'unexpanded-drawer'}
                variant="permanent"
                open={isExpanded}
                PaperProps={{
                    sx: {
                        width: isExpanded ? DASHBOARD_SIDEBAR_WIDTH : 0,
                        overflowX: "hidden",
                        mt: `${DASHBOARD_HEADER_HEIGHT}px`,
                        height: `calc(100% - ${DASHBOARD_HEADER_HEIGHT}px)`,
                        borderRight: 1,
                        borderColor: "divider",
                        zIndex: "999",
                        bgcolor: "background.paper",
                        left: DASHBOARD_ICON_RAIL_WIDTH,
                        position: "fixed",
                        transition: (t) =>
                            t.transitions.create("width", {
                                duration: t.transitions.duration.shortest,
                            }),
                    },
                }}
            >
                <div className="sidebar-main-drawer">
                    <div className="ai-tools-header">
                        <div className="ai-tools-content-flex">
                            <h2>All Tools</h2>
                            <IconButton
                                onClick={onToggleExpanded}
                                size="small"
                                aria-label="Toggle sidebar"
                                disableRipple
                                sx={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 1,
                                    color: "text.secondary",
                                }}
                            >
                                <SvgIcon
                                    viewBox="0 0 24 24"
                                    sx={{
                                        width: 20,
                                        height: 20,
                                        transform: isExpanded ? "none" : "scaleX(-1)",
                                    }}
                                >
                                    <path d="M16.5886 8.9634C16.8815 8.67051 16.8815 8.19564 16.5886 7.90274C16.2957 7.60985 15.8208 7.60985 15.5279 7.90275L16.0583 8.43308L16.5886 8.9634ZM12.4436 12.0478L11.9133 11.5175C11.6204 11.8103 11.6204 12.2852 11.9133 12.5781L12.4436 12.0478ZM15.5279 16.1928C15.8208 16.4857 16.2957 16.4857 16.5886 16.1928C16.8815 15.8999 16.8815 15.425 16.5886 15.1321L16.0583 15.6625L15.5279 16.1928ZM21.0019 6.59889H20.2519V17.4011H21.0019H21.7519V6.59889H21.0019ZM2.99811 9.49908H3.74811V6.59889H2.99811H2.24811V9.49908H2.99811ZM2.99811 17.4011H3.74811V14.501H2.99811H2.24811V17.4011H2.99811ZM7.49905 21.0019V20.2519H6.59886V21.0019V21.7519H7.49905V21.0019ZM6.59886 2.99814V3.74814H7.49905V2.99814V2.24814H6.59886V2.99814ZM7.49905 2.99814H6.74905V21.0019H7.49905H8.24905V2.99814H7.49905ZM2.99811 17.4011H2.24811C2.24811 19.804 4.196 21.7519 6.59886 21.7519V21.0019V20.2519C5.02443 20.2519 3.74811 18.9756 3.74811 17.4011H2.99811ZM21.0019 17.4011H20.2519C20.2519 18.9756 18.9755 20.2519 17.4011 20.2519V21.0019V21.7519C19.804 21.7519 21.7519 19.804 21.7519 17.4011H21.0019ZM21.0019 6.59889H21.7519C21.7519 4.19604 19.804 2.24814 17.4011 2.24814V2.99814V3.74814C18.9755 3.74814 20.2519 5.02446 20.2519 6.59889H21.0019ZM2.99811 6.59889H3.74811C3.74811 5.02446 5.02443 3.74814 6.59886 3.74814V2.99814V2.24814C4.196 2.24814 2.24811 4.19603 2.24811 6.59889H2.99811ZM16.0583 8.43308L15.5279 7.90275L11.9133 11.5175L12.4436 12.0478L12.9739 12.5781L16.5886 8.9634L16.0583 8.43308ZM12.4436 12.0478L11.9133 12.5781L15.5279 16.1928L16.0583 15.6625L16.5886 15.1321L12.9739 11.5175L12.4436 12.0478ZM7.49905 2.99814V3.74814H17.4011V2.99814V2.24814H7.49905V2.99814ZM17.4011 21.0019V20.2519H7.49905V21.0019V21.7519H17.4011V21.0019Z" fill="#71717A" />
                                </SvgIcon>
                            </IconButton>
                        </div>
                    </div>
                    {/* Menu sections with dropdowns */}
                    <Box>
                        {dynamicMenu.length === 0 ? (
                            <Box sx={{ px: 2, py: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No menu items available
                                </Typography>
                            </Box>
                        ) : (
                            dynamicMenu.map((group, index) => {
                                const isGroupExpanded = expandedSections[group.key];
                                const hasActiveItem = checkIfGroupHasActiveItem(group);
                                const hasItems = group.items && group.items.length > 0;
                                const hasDirectLink = group.to;

                                // If group has direct link and no items, render as single item
                                if (hasDirectLink && !hasItems) {
                                    const isActive = pathname === group.to || 
                                                    (group.to === ROUTES.rolesPermission.path && isRolesPermissionRoute(pathname));
                                    return (
                                        <div className="sidebar-menu-container" key={group.key}>
                                            <Box>
                                                <Box sx={{ px: '0', py: '0' }}>
                                                    <NavItem
                                                        to={group.to}
                                                        icon={group.icon}
                                                        label={group.label}
                                                        isActive={isActive}
                                                        isCollapsed={false}
                                                    />
                                                </Box>
                                                {index < dynamicMenu.length - 1 && ''}
                                            </Box>
                                        </div>
                                    );
                                }

                                // If group has items, render as collapsible section
                                if (hasItems) {
                                    return (
                                        <div className="sidebar-sub-menu-container" key={group.key}>
                                            <Box>
                                                {/* Section header with dropdown toggle */}
                                                <Box
                                                    sx={{
                                                        px: '10px',
                                                        pt: index === 1 ? '10px' : '10px',
                                                        pb: '10px',
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => toggleSection(group.key)}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                        }}
                                                    >
                                                        <Typography className="menu-parent-dropdown"
                                                            variant="body2"
                                                            sx={{
                                                                color: "#71717A",
                                                                fontSize: "14px",
                                                                fontWeight: hasActiveItem && 400,
                                                            }}
                                                        >
                                                            {group.label}
                                                        </Typography>
                                                        <IconButton
                                                            className="icon-dropdown-button"
                                                            size="small"
                                                            aria-label={isGroupExpanded ? "Collapse section" : "Expand section"}
                                                            sx={{
                                                                transform: isGroupExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                                                                transition: "transform 0.2s",
                                                            }}
                                                        >
                                                            <KeyboardArrowDownOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                                <Divider />

                                                {/* Collapsible menu items */}
                                                <Collapse in={isGroupExpanded} timeout="auto" unmountOnExit className="dashboard-collapsible-container">
                                                    <Box sx={{ px: '0', py: '10px' }}>
                                                        <List disablePadding sx={{ marginLeft: '15px'}}>
                                                            {group.items.map((item) => (
                                                                <MenuItemWithChildren
                                                                    key={item.key}
                                                                    item={item}
                                                                    pathname={pathname}
                                                                    level={0}
                                                                />
                                                            ))}
                                                        </List>
                                                    </Box>
                                                </Collapse>
                                            </Box>
                                        </div>
                                    );
                                }

                                return null;
                            })
                        )}
                    </Box>
                </div>
            </Drawer>

            {/* sign out popup */}
            {logoutLoaderStatus && (
                <div className="logout-popup-container" ref={logoutRef} onMouseDown={(e) => e.stopPropagation()}>
                    <div className="logo-popup-user" >
                        <div className="logout-card">
                            <div className="logout-flex">
                                <div className="logout-avatar">
                                    {`${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase()}
                                </div>
                                <div className="logout-avatar-txt">
                                    <h3>{`${user?.first_name} ${user?.last_name}`.replace(/\b\w/g, c => c.toUpperCase())}</h3>
                                    <p>{user?.email}</p>
                                </div>
                            </div>
                        </div>
                        {!user?.entity_type && 
                        <div className="logout-card account-manage-txt">
                            <p>{user?.entity_type}user</p>
                        </div>}
                        <div className="logout-card signout-btn-container" onClick={() => dispatch(logout())} >
                            <button type="button" className="flex-logout-btn-flex">
                                <div className="icon-logout">
                                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.9997 5.33333L14.6663 8M14.6663 8L11.9997 10.6667M14.6663 8H5.99967M9.99967 2.80269C9.14984 2.29218 8.16317 2 7.11079 2C3.91981 2 1.33301 4.68629 1.33301 8C1.33301 11.3137 3.91981 14 7.11079 14C8.16317 14 9.14984 13.7078 9.99967 13.1973" stroke="#B42318" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="icon-logout-txt">
                                    <p>Sign out</p>
                                </div>
                            </button>
                            <div className="f-flex">
                                <svg width="32" height="11" viewBox="0 0 32 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.00861 0.681785H10.091V1.61928H6.00861V0.681785ZM8.88109e-05 1.61928V0.681785H3.35804L7.29554 8.47156H10.091V9.40906H6.73304L2.79554 1.61928H8.88109e-05ZM12.2696 5.04542L17.3151 -3.3617e-05L22.3605 5.04542H19.7696V9.40906H14.8605V5.04542H12.2696ZM14.183 4.27838H15.7128V8.64201H18.9173V4.27838H20.4472L17.3151 1.14627L14.183 4.27838ZM27.6755 6.68178H28.8346L29.8062 7.96019L30.0619 8.3011L31.5107 10.2272H30.3517L29.3971 8.94883L29.1585 8.62497L27.6755 6.68178ZM31.8687 5.04542C31.8687 5.96588 31.7025 6.76133 31.3701 7.43178C31.0377 8.10224 30.5818 8.61928 30.0022 8.98292C29.4227 9.34656 28.7607 9.52838 28.0164 9.52838C27.2721 9.52838 26.6102 9.34656 26.0306 8.98292C25.4511 8.61928 24.9951 8.10224 24.6627 7.43178C24.3303 6.76133 24.1642 5.96588 24.1642 5.04542C24.1642 4.12497 24.3303 3.32951 24.6627 2.65906C24.9951 1.9886 25.4511 1.47156 26.0306 1.10792C26.6102 0.744285 27.2721 0.562466 28.0164 0.562466C28.7607 0.562466 29.4227 0.744285 30.0022 1.10792C30.5818 1.47156 31.0377 1.9886 31.3701 2.65906C31.7025 3.32951 31.8687 4.12497 31.8687 5.04542ZM30.846 5.04542C30.846 4.28974 30.7195 3.65196 30.4667 3.13207C30.2167 2.61218 29.8772 2.21872 29.4482 1.95167C29.0221 1.68463 28.5448 1.5511 28.0164 1.5511C27.488 1.5511 27.0093 1.68463 26.5803 1.95167C26.1542 2.21872 25.8147 2.61218 25.5619 3.13207C25.3119 3.65196 25.1869 4.28974 25.1869 5.04542C25.1869 5.8011 25.3119 6.43889 25.5619 6.95877C25.8147 7.47866 26.1542 7.87213 26.5803 8.13917C27.0093 8.40622 27.488 8.53974 28.0164 8.53974C28.5448 8.53974 29.0221 8.40622 29.4482 8.13917C29.8772 7.87213 30.2167 7.47866 30.4667 6.95877C30.7195 6.43889 30.846 5.8011 30.846 5.04542Z" fill="#717680" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default memo(DashboardSidebar);
