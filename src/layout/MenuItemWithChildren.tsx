import React, { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowRightOutlinedIcon from "@mui/icons-material/KeyboardArrowRightOutlined";
import { useLocation } from "react-router-dom";
import NavItem from "../common_components/NavItem";
import Popover from "@mui/material/Popover";
import { MenuItemTransformed } from "../utils/menuTransformer";
import { ROUTES } from "../routes/routes.constants";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../redux/store";
import { setActiveModuleKey } from "../redux/userDataSlice";

interface MenuItemWithChildrenProps {
    item: MenuItemTransformed;
    pathname?: string;
    level?: number;
}

/**
 * Recursive component to handle nested menu items (parent -> child -> child)
 * Supports unlimited nesting levels
 */
function MenuItemWithChildren({ item, pathname, level = 0 }: MenuItemWithChildrenProps): React.ReactElement {

    const location = useLocation();
    const currentPathname = location.pathname;
    const hasChildren = item.items && item.items.length > 0;
    const dispatch = useDispatch<AppDispatch>();
    
    // Helper function to check if pathname matches roles permission routes
    const isRolesPermissionRoute = (path: string): boolean => {
        // Extract base path from edit route (remove :id parameter)
        const editRouteBase = ROUTES.rolePermissionEdit.path.replace('/:id', '');
        return path === ROUTES.rolesPermission.path || 
               path.startsWith(ROUTES.rolePermissionCreate.path) || 
               path.startsWith(editRouteBase + '/');
    };
    
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const menuItemRef = useRef<HTMLDivElement>(null);

    const handlePopoverToggle = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (anchorEl) {
            setAnchorEl(null);
        } else {
            setAnchorEl(event.currentTarget);
        }
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    // Close popover when pathname changes (navigation happens)
    useEffect(() => {
        if (anchorEl) {
            handlePopoverClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPathname]);

    // If item has direct link and no children, render as simple nav item
    if (item.to && !hasChildren) {
        const isActive = currentPathname === item.to || 
                        (item.to === ROUTES.rolesPermission.path && isRolesPermissionRoute(currentPathname));
        return (
            <div className="main-sub-menu-container">
                <NavItem
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    isActive={isActive}
                    isCollapsed={false}
                    onClick={() => {
                        // Explicitly set active module key (no route-based module detection)
                        dispatch(setActiveModuleKey(item.key));
                    }}
                />
            </div>
        );
    }

    // If item has children, render as expandable item
    if (hasChildren) {

        const checkActiveChild = (items: MenuItemTransformed[]): boolean => {
            return items.some((child) => {
                if (child.to === currentPathname) return true;
                // Special handling for roles permission routes
                if (child.to === ROUTES.rolesPermission.path && isRolesPermissionRoute(currentPathname)) {
                    return true;
                }
                if (child.items && child.items.length > 0) {
                    return checkActiveChild(child.items);
                }
                return false;
            });
        };
        const hasActiveChild = checkActiveChild(item.items);

        // If parent has URL, wrap in NavItem, otherwise just expandable
        if (item.to) {
            const isActive = currentPathname === item.to || 
                            (item.to === ROUTES.rolesPermission.path && isRolesPermissionRoute(currentPathname));
            return (
                <div className="main-sub-other-menu-container">
                    <Box
                        ref={menuItemRef}
                        onClick={(e) => {
                            if (hasChildren) {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePopoverToggle(e);
                            }
                        }}
                        sx={{ position: 'relative' }}
                    >
                        <NavItem
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            isActive={isActive}
                            isCollapsed={false}
                            onClick={(e) => {
                                // If this parent has its own route, treat click as module activation
                                dispatch(setActiveModuleKey(item.key));
                                if (hasChildren) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}
                        />
                    </Box>
                    {/* Nested children in popover */}
                    {hasChildren && (
                        <Popover
                            open={open}
                            anchorEl={anchorEl}
                            onClose={handlePopoverClose}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            PaperProps={{
                                sx: {
                                    minWidth: 200,
                                    maxHeight: 400,
                                    overflow: 'auto',
                                    mt: 0.5,
                                },
                            }}
                        >
                            <List disablePadding>
                                {item.items.map((child) => (
                                    <MenuItemWithChildren
                                        key={child.key}
                                        item={child}
                                        pathname={pathname}
                                        level={level + 1}
                                    />
                                ))}
                            </List>
                        </Popover>
                    )}
                </div>
            );
        }

        return (
            <div className="under-sub-menu">
                {/* Parent item - clickable to expand/collapse */}
                <Box
                    ref={menuItemRef}
                    onClick={handlePopoverToggle}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        padding: '7px 10px',
                        gap: '10px',
                        margin: '0',
                        border: '1px solid transparent',
                        cursor: "pointer",
                        "&:hover": {
                            bgcolor: "#E4E4E7",
                            borderRadius: '8px'
                        },
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", flex: 1, gap: '10px', minWidth: 0 }}>
                        <Box
                            sx={{
                                minWidth: 'unset',
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: hasActiveChild ? "primary.main" : "text.secondary",
                            }}
                        >
                            {item.icon ? <item.icon fontSize="small" /> : null}
                        </Box>
                        <Box
                            component="span"
                            sx={{
                                flex: 1,
                                fontSize: "14px",
                                fontWeight: hasActiveChild ?  500 : 500,
                                color: hasActiveChild ? "#0000000a" : "",
                                ml: 0,
                            }}
                        >
                            {item.label}
                        </Box>
                    </Box>
                    {hasChildren && (
                        <IconButton
                            size="small"
                            sx={{
                                width: 24,
                                height: 24,
                            }}
                        >
                            <KeyboardArrowRightOutlinedIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>

                {/* Nested children in popover */}
                {hasChildren && (
                    <Popover
                        className="sub-menu-popover-sidebar"
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        PaperProps={{
                            sx: {
                                minWidth: 200,
                                maxHeight: 400,
                                overflow: 'auto',
                                mt: 0.5,
                            },
                        }}
                    >
                        <List disablePadding>
                            {item.items.map((child) => (
                                <MenuItemWithChildren
                                    key={child.key}
                                    item={child}
                                    pathname={pathname}
                                    level={level + 1}
                                />
                            ))}
                        </List>
                    </Popover>
                )}
            </div>
        );
    }

    // Fallback: render as simple item even without link
    return (
        <Box sx={{ px: 1, py: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                    sx={{
                        minWidth: 'unset',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.secondary",
                    }}
                >
                    {item.icon ? <item.icon fontSize="small" /> : null}
                </Box>
                <Box
                    component="span"
                    sx={{
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        ml: 1,
                    }}
                >
                    {item.label}
                </Box>
            </Box>
        </Box>
    );
}

export default MenuItemWithChildren;
