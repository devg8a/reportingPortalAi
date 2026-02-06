import React, { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { TableColumn, SortConfig, PinnedColumns } from "./tableTypes";

interface ColumnHeaderMenuProps {
    column: TableColumn;
    sortConfig?: SortConfig | null;
    onSort?: (columnId: string, direction: "asc" | "desc") => void;
    onPin?: (columnId: string, position: "left" | "right" | null) => void;
    onClearSort?: () => void;
    onFilter?: (column: TableColumn, clear: boolean) => void;
    columnFilters?: Record<string, string>;
    pinnedColumns?: PinnedColumns;
    enableColumnPinning?: boolean;
    enableColumnFilters?: boolean;
    activeFilterColumnId?: string | null;
    showFilterRow?: boolean;
    enabledFilterColumnIds?: Set<string>;
}

function ColumnHeaderMenu({
    column,
    sortConfig,
    onSort,
    onPin,
    onClearSort,
    onFilter,
    columnFilters = {},
    pinnedColumns = { left: [], right: [] },
    enableColumnPinning = false,
    enableColumnFilters = false,
    activeFilterColumnId,
    showFilterRow = false,
    enabledFilterColumnIds,
}: ColumnHeaderMenuProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const isSorted = sortConfig?.columnId === column.id;
    const sortDirection = isSorted ? sortConfig?.direction : null;
    const isPinnedLeft = pinnedColumns.left.includes(column.id);
    const isPinned = isPinnedLeft;

    const enabledSet = enabledFilterColumnIds ?? new Set<string>();
    const isEnabled = enabledSet.has(column.id);

    // FINAL RULES (multi-column filters support)
    // - Filter by: disable once column ka filter ON kar diya
    // - Clear filter: enable jab tak column enabled hai (chahe value ho ya na ho)
    const disableFilterBy = isEnabled;
    const enableClearFilter = isEnabled;

    // Sort handlers with proper direction
    const handleSortAsc = () => {
        if (onSort) {
            if (isSorted && sortDirection === "asc") {
                onSort(column.id, "desc");
            } else {
                onSort(column.id, "asc");
            }
        }
        handleClose();
    };

    const handleSortDesc = () => {
        if (onSort) {
            if (isSorted && sortDirection === "desc") {
                onSort(column.id, "asc");
            } else {
                onSort(column.id, "desc");
            }
        }
        handleClose();
    };

    const handleClearSort = () => {
        if (onClearSort) {
            onClearSort();
        }
        handleClose();
    };

    // Pin handlers
    const handlePinLeft = () => {
        if (onPin) {
            onPin(column.id, "left");
        }
        handleClose();
    };

    const handleUnpin = () => {
        if (onPin) {
            onPin(column.id, null);
        }
        handleClose();
    };

    // Filter handlers
    const handleFilter = () => {
        if (onFilter) {
            onFilter(column, false);
        }
        handleClose();
    };

    const handleClearFilter = () => {
        if (onFilter) {
            onFilter(column, true);
        }
        handleClose();
    };

    // Show menu only if column has at least one action
    if (!column.sortable && !enableColumnPinning && !enableColumnFilters) {
        return null;
    }

    return (
        <>
            <IconButton
                size="small"
                onClick={handleClick}
                sx={{
                    padding: "2px",
                    opacity: 0.6,
                    "&:hover": { opacity: 1 },
                }}
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={(e) => e.stopPropagation()}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                className="popup-menu-container"
            >
                {/* Section 1: Sorting Options */}
                {column.sortable && (
                    <MenuItem
                        onClick={handleClearSort}
                        disabled={!isSorted}
                    >
                        <ListItemIcon>
                            <div className="d-flex" style={{ opacity: isSorted ? 1 : 0.3 }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 12.333 13.333 9m0 3.333L10 9" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.334 9.333H2M7.334 12H2m0-8h7m4.333 0h-1.5m1.501 2.667h-7M2 6.667h1.5" stroke="#000" strokeLinecap="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Clear sort</ListItemText>
                    </MenuItem>
                )}
                {column.sortable && (
                    <MenuItem
                        onClick={handleSortAsc}
                        disabled={isSorted && sortDirection === "asc"}
                    >
                        <ListItemIcon>
                            <div className="d-flex" style={{ opacity: (isSorted && sortDirection === "asc") ? 0.3 : 1 }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.667 11.333h4M2.667 8h6M12 7.333v5.334m0 0 2-2m-2 2-2-2m-7.333-6h8" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Sort by {column.label} ascending</ListItemText>
                    </MenuItem>
                )}
                {column.sortable && (
                    <MenuItem
                        onClick={handleSortDesc}
                        disabled={isSorted && sortDirection === "desc"}
                    >
                        <ListItemIcon>
                            <div className="d-flex" style={{ opacity: (isSorted && sortDirection === "desc") ? 0.3 : 1 }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.667 11.333h8M2.666 8h6m-6-3.333h4m5.333 4V3.333m0 0 2 2m-2-2-2 2" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Sort by {column.label} descending</ListItemText>
                    </MenuItem>
                )}

                {/* Section 2: Filtering Options */}
                {enableColumnFilters && column.hideable !== false && column.sortable && (
                    <MenuItem divider />
                )}

                {enableColumnFilters && column.hideable !== false && (
                    <MenuItem
                        onClick={handleClearFilter}
                        disabled={!enableClearFilter}
                    >
                        <ListItemIcon>
                            <div className="d-flex" style={{ opacity: enableClearFilter ? 1 : 0.3 }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.333 7.333h-4M6.667 10H5.333m5.333-5.333H5.333m8 2.333V4.533c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.108-.218H5.867c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.875.874c-.217.428-.217.988-.217 2.108v6.934c0 1.12 0 1.68.217 2.108a2 2 0 0 0 .875.874c.427.218.987.218 2.108.218h1.8m7 0-1-1M14.333 12a2.333 2.333 0 1 1-4.667 0 2.333 2.333 0 0 1 4.667 0" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Clear Filter</ListItemText>
                    </MenuItem>
                )}
                {enableColumnFilters && column.hideable !== false && (
                    <MenuItem
                        onClick={handleFilter}
                        disabled={disableFilterBy}
                    >
                        <ListItemIcon>
                            <div className="d-flex">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.333 7.333h-4M6.667 10H5.333m5.333-5.333H5.333m8 2.333V4.533c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.108-.218H5.867c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.875.874c-.217.428-.217.988-.217 2.108v6.934c0 1.12 0 1.68.217 2.108a2 2 0 0 0 .875.874c.427.218.987.218 2.108.218h1.8m7 0-1-1M14.333 12a2.333 2.333 0 1 1-4.667 0 2.333 2.333 0 0 1 4.667 0" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Filter by {column.label}</ListItemText>
                    </MenuItem>
                )}

                {/* Section 3: Pinning Options */}
                {enableColumnPinning && column.hideable !== false && (column.sortable || enableColumnFilters) && (
                    <MenuItem divider />
                )}
                {enableColumnPinning && column.hideable !== false && !isPinned && (
                    <MenuItem onClick={handlePinLeft}>
                        <ListItemIcon>
                            <div className="d-flex">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m5.585 10.411-3.772 3.771m5.984-9.754-1.041 1.04c-.085.085-.127.128-.176.162a.7.7 0 0 1-.138.073 1.4 1.4 0 0 1-.231.057l-2.443.489c-.635.127-.952.19-1.1.358a.67.67 0 0 0-.163.534c.031.221.26.45.718.908l4.724 4.724c.457.458.686.687.908.717a.67.67 0 0 0 .534-.161c.167-.149.23-.466.358-1.101l.488-2.443a1.4 1.4 0 0 1 .057-.232.7.7 0 0 1 .074-.138c.034-.048.076-.09.161-.175l1.04-1.04c.055-.055.082-.082.112-.106a1 1 0 0 1 .084-.057c.033-.019.068-.034.139-.064l1.663-.713c.485-.208.727-.312.838-.48a.67.67 0 0 0 .095-.498c-.04-.197-.226-.383-.6-.756l-3.428-3.43c-.373-.372-.56-.559-.757-.599a.67.67 0 0 0-.498.096c-.168.11-.272.353-.48.838l-.712 1.663c-.03.07-.046.106-.065.139a1 1 0 0 1-.056.084c-.024.03-.051.057-.106.111" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Pin to Left</ListItemText>
                    </MenuItem>
                )}
                {enableColumnPinning && column.hideable !== false && isPinned && (
                    <MenuItem
                        onClick={handleUnpin}
                    >
                        <ListItemIcon>
                            <div className="d-flex" style={{
                                transform: 'rotate(45deg)',
                                opacity: 0.7
                            }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10v4.667M5.333 4.872v1.42c0 .14 0 .209-.013.275a.7.7 0 0 1-.06.17c-.03.06-.074.114-.16.222L4.053 8.267c-.444.555-.666.832-.666 1.066 0 .203.092.395.251.521.182.146.538.146 1.248.146h6.228c.71 0 1.066 0 1.248-.146a.67.67 0 0 0 .251-.521c0-.234-.222-.511-.666-1.066l-1.046-1.308a1.4 1.4 0 0 1-.161-.223.7.7 0 0 1-.06-.17c-.013-.065-.013-.135-.013-.273v-1.42c0-.078 0-.116.004-.154a1 1 0 0 1 .02-.1 2 2 0 0 1 .052-.143l.672-1.68c.196-.49.294-.735.253-.932a.67.67 0 0 0-.284-.42c-.168-.11-.432-.11-.96-.11H5.577c-.528 0-.792 0-.96.11a.67.67 0 0 0-.284.42c-.04.197.057.442.253.932l.672 1.68c.029.071.043.107.053.144a1 1 0 0 1 .02.1c.003.037.003.075.003.152" stroke="#181d27" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </ListItemIcon>
                        <ListItemText>Unpin</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}

export default ColumnHeaderMenu;
