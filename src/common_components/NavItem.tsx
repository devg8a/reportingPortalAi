import React, { memo } from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { Link as RouterLink } from "react-router-dom";
import { SvgIconProps } from "@mui/material/SvgIcon";

interface NavItemProps {
    to?: string;
    icon: React.ComponentType<SvgIconProps>;
    label: string;
    isActive: boolean;
    isCollapsed: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

/**
 * Reusable sidebar nav item.
 * - Uses MUI + React Router Link
 * - Handles collapsed tooltips
 */
function NavItem({
    to,
    icon: Icon,
    label,
    isActive,
    isCollapsed,
    onClick,
}: NavItemProps): React.ReactElement {
    const handleClick = (e: React.MouseEvent): void => {
        // Prevent default navigation if onClick is provided
        if (onClick) {
            onClick(e);
        }
        // RouterLink will handle navigation, no need to prevent default
    };

    const button = (
        <ListItemButton
            component={RouterLink}
            to={to || '#'}
            onClick={handleClick}
            selected={isActive}
            sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.25,
                "&.Mui-selected": {
                    bgcolor: "primary.50",
                    "&:hover": { bgcolor: "primary.50" },
                },
            }}
        >
            <ListItemIcon sx={{ minWidth: 36, color: isActive ? "primary.main" : "text.secondary" }}>
                <Icon fontSize="small" />
            </ListItemIcon>
            {!isCollapsed && (
                <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                        variant: "body2",
                        sx: { fontWeight: isActive ? 600 : 500 },
                    }}
                />
            )}
        </ListItemButton>
    );

    if (!isCollapsed) return button;

    return (
        <Tooltip title={label} placement="right">
            {button}
        </Tooltip>
    );
}

export default memo(NavItem);
