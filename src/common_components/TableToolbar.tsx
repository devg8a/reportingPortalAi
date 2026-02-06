import React, { useMemo } from "react";
import Box from "@mui/material/Box";
import TableToolbarActions from "./TableToolbarActions";
import { BADGE_VARIANTS } from "./tableConstants";

interface TableToolbarProps {
    title?: string;
    badgeText?: string;
    badgeValue?: string | number;
    badgeColor?: string;
    onSearch?: (evt: any) => void;
    onExpandClick?: () => void;
    onSearchChange?: (text: string) => void;
    onDensityChange?: () => void;
    showSearch?: boolean;
    showRows?: boolean;
    showExpand?: boolean;
    showFullScreen?: boolean;
    customActions?: React.ReactNode;
    searchValue?: string;
    enableColumnVisibility?: boolean;
    onColumnVisibilityClick?: (event: React.MouseEvent<HTMLElement>) => void;
    enableColumnFilters?: boolean;
    showFilterRow?: boolean;
    onFilterRowToggle?: () => void;
}

function TableToolbar({
    title = "Table",
    badgeText = "",
    badgeValue = "",
    badgeColor = BADGE_VARIANTS.ERROR,
    onSearch,
    onExpandClick,
    onSearchChange,
    onDensityChange,
    showSearch,
    showRows,
    showExpand,
    showFullScreen = true,
    customActions,
    searchValue = "",
    enableColumnVisibility = false,
    onColumnVisibilityClick,
    enableColumnFilters = false,
    showFilterRow = false,
    onFilterRowToggle,
}: TableToolbarProps) {
    /**
     * Get badge CSS class based on color variant
     * @returns {string} Badge CSS class name
     */
    const getBadgeClass = useMemo(() => {
        switch (badgeColor) {
            case BADGE_VARIANTS.ERROR:
                return "table-toolbar-badge-error";
            case BADGE_VARIANTS.SUCCESS:
                return "table-toolbar-badge-success";
            default:
                return "table-toolbar-badge-default";
        }
    }, [badgeColor]);

    const hasBadge = Boolean(badgeText || badgeValue);

    return (
        <Box className="table-toolbar-container">
            <Box className="table-toolbar-header">
                <Box className="table-toolbar-title-section">
                    {title && <Box className="table-toolbar-title">{title}</Box>}
                    {hasBadge && (
                        <Box className="table-toolbar-badge-section">
                            {badgeText && (
                                <Box className="table-toolbar-badge-text">{badgeText}</Box>
                            )}
                            {badgeValue && (
                                <Box className={`table-toolbar-badge ${getBadgeClass}`}>
                                    {badgeValue}
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
                <TableToolbarActions
                    onSearch={onSearch}
                    onExpandClick={onExpandClick}
                    onSearchChange={onSearchChange}
                    onDensityChange={onDensityChange}
                    showSearch={showSearch}
                    showRows={showRows}
                    showExpand={showExpand}
                    showFullScreen={showFullScreen}
                    customActions={customActions}
                    searchValue={searchValue}
                    enableColumnVisibility={enableColumnVisibility}
                    onColumnVisibilityClick={onColumnVisibilityClick}
                    enableColumnFilters={enableColumnFilters}
                    showFilterRow={showFilterRow}
                    onFilterRowToggle={onFilterRowToggle}
                />
            </Box>
        </Box>
    );
}

export default TableToolbar;
