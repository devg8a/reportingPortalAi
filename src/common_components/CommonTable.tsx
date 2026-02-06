import React, { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import CloseIcon from "@mui/icons-material/Close";
import { useLayout } from "../contexts/LayoutContext";
import ColumnHeaderMenu from "./ColumnHeaderMenu";
import ColumnVisibilityPanel from "./ColumnVisibilityPanel";
import {
    flattenColumns,
    normalizeColumns,
    toSet,
    getColumnWidth as getColumnWidthUtil,
    getColumnAlign as getColumnAlignUtil,
    hasGroupedColumns,
    getMaxColumnDepth,
} from "./tableUtils";
import {
    COLUMN_WIDTHS,
    EXPAND_TRIGGERS,
    SUMMARY_ROW_POSITIONS,
    SORT_DIRECTIONS,
    FILTER_TYPES,
    DEFAULT_MESSAGES,
    Z_INDEX,
    DRAG_DROP,
} from "./tableConstants";
import { TableColumn, SortConfig, PinnedColumns, ColumnFilterConfig } from "./tableTypes";
import CommonLoader from "./CommonLoader";

interface CommonTableProps {
    columns?: TableColumn[];
    rows?: any[];
    renderCell?: (row: any, column: TableColumn) => React.ReactNode;
    renderExpandedContent?: (row: any) => React.ReactNode;
    expandTrigger?: string;
    onExpandToggle?: (rowId: string) => void;
    sortConfig?: SortConfig | null;
    onSortChange?: (columnId: string, direction: "asc" | "desc" | null) => void;
    onRowClick?: (row: any) => void;
    isLoading?: boolean;
    isFirstLoad?: boolean;
    isError?: boolean;
    emptyMessage?: string;
    renderEmpty?: () => React.ReactNode;
    renderError?: () => React.ReactNode;
    renderLoading?: () => React.ReactNode;
    type?: string;
    enableSelection?: boolean;
    selectedRows?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    hiddenColumns?: Set<string>;
    onColumnVisibilityChange?: (hiddenColumns: Set<string>) => void;
    columnVisibilityAnchorEl?: HTMLElement | null;
    onColumnVisibilityClose?: () => void;
    enableColumnReorder?: boolean;
    columnOrder?: string[] | null;
    onColumnOrderChange?: (newOrder: string[]) => void;
    enableColumnPinning?: boolean;
    pinnedColumns?: PinnedColumns;
    onColumnPinningChange?: (pinned: PinnedColumns) => void;
    enableColumnActions?: boolean;
    enableColumnFilters?: boolean;
    showFilterRow?: boolean;
    onFilterRowToggle?: (config: { mode: string; columnId: string; open: boolean }) => void;
    activeFilterColumnId?: string | null;
    onActiveFilterColumnIdChange?: (columnId: string | null) => void;
    columnFilters?: Record<string, string>;
    onColumnFilterChange?: (columnId: string, value: string) => void;
    enableSummaryRow?: boolean;
    renderSummaryRow?: (rows: any[], column: TableColumn) => React.ReactNode;
    summaryRowPosition?: "top" | "bottom";
    columnVisibilityConfig?: any;
    columnFilterConfig?: ColumnFilterConfig;
    controlledExpandedRows?: Set<string> | null;
    enableColumnVisibility?: boolean;
    tableHeadClassName?: string
    expandCellClassName?: string
}

function CommonTable({
    columns = [],
    rows = [],
    renderCell,
    renderExpandedContent,
    expandTrigger = EXPAND_TRIGGERS.ICON,
    onExpandToggle,
    sortConfig = null,
    onSortChange,
    onRowClick,
    isLoading = false,
    isFirstLoad = false,
    isError = false,
    emptyMessage = DEFAULT_MESSAGES.NO_DATA,
    renderEmpty,
    renderError,
    renderLoading,
    type,
    enableSelection = false,
    selectedRows = new Set(),
    onSelectionChange,
    hiddenColumns = new Set(),
    onColumnVisibilityChange,
    columnVisibilityAnchorEl = null,
    onColumnVisibilityClose,
    enableColumnReorder = false,
    columnOrder = null,
    onColumnOrderChange,
    enableColumnPinning = false,
    pinnedColumns = { left: [], right: [] },
    onColumnPinningChange,
    enableColumnActions = false,
    enableColumnFilters = false,
    showFilterRow = false,
    onFilterRowToggle,
    activeFilterColumnId,
    onActiveFilterColumnIdChange,
    columnFilters = {},
    onColumnFilterChange,
    enableSummaryRow = false,
    renderSummaryRow,
    summaryRowPosition = SUMMARY_ROW_POSITIONS.BOTTOM,
    columnVisibilityConfig = null,
    columnFilterConfig = null,
    controlledExpandedRows = null,
    tableHeadClassName = "reusable-table-header-label",
    expandCellClassName = "reusable-table-cell-expanded-content"
}: CommonTableProps) {
    const { isDense } = useLayout();

    // Internal state
    const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
    const [columnVisibilityAnchor, setColumnVisibilityAnchor] = useState<HTMLElement | null>(null);
    const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
    const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
    const [columnOriginalPositions, setColumnOriginalPositions] = useState<Record<string, number>>({});
    const [internalActiveFilterColumnId, setInternalActiveFilterColumnId] = useState<string | null>(null);
    const [internalExpandedRows, setInternalExpandedRows] = useState<Set<string>>(new Set());
    const [filterEnabledColumns, setFilterEnabledColumns] = useState<Set<string>>(new Set());

    // Computed values
    const effectiveActiveFilterColumnId =
        activeFilterColumnId !== undefined
            ? activeFilterColumnId
            : internalActiveFilterColumnId;

    const effectiveAnchor = columnVisibilityAnchorEl || columnVisibilityAnchor;

    const isControlledExpand = typeof onExpandToggle === "function";
    const expandedRowsSet = isControlledExpand
        ? new Set(controlledExpandedRows || [])
        : internalExpandedRows;

    const hiddenColumnsSet = toSet(hiddenColumns);
    const selectedRowsSet = toSet(selectedRows);

    // Normalize columns with memoization
    const normalizedColumns = useMemo(() => {
        return normalizeColumns(
            columns,
            hiddenColumnsSet,
            columnOrder,
            pinnedColumns
        );
    }, [columns, hiddenColumnsSet, columnOrder, pinnedColumns]);

    // Get visible columns (flattened for rendering)
    const visibleColumns = useMemo(() => {
        const allCols = [
            ...normalizedColumns.leftPinned,
            ...normalizedColumns.unpinned,
            ...normalizedColumns.rightPinned,
        ];
        return flattenColumns(allCols);
    }, [normalizedColumns]);

    // Selection state
    const isAllSelected = useMemo(() => {
        if (!enableSelection || rows.length === 0) return false;
        return rows.every((row) => {
            const rowId = row.id ?? rows.indexOf(row);
            return selectedRowsSet.has(rowId);
        });
    }, [enableSelection, rows, selectedRowsSet]);

    const isIndeterminate = useMemo(() => {
        if (!enableSelection) return false;
        const hasSelected = rows.some((row) => {
            const rowId = row.id ?? rows.indexOf(row);
            return selectedRowsSet.has(rowId);
        });
        return hasSelected && !isAllSelected;
    }, [enableSelection, rows, selectedRowsSet, isAllSelected]);

    // Column width and align helpers
    const getColumnWidth = useCallback(
        (column: TableColumn) => {
            if (column?.width) return column.width;
            if (column?.id === "expand") return COLUMN_WIDTHS.EXPAND;
            if (column?.id === "selection") return COLUMN_WIDTHS.SELECTION;
            return COLUMN_WIDTHS.DEFAULT;
        },
        []
    );

    const getColumnAlign = useCallback(
        (column: TableColumn) => {
            return getColumnAlignUtil(column, "left");
        },
        []
    );

    // Display flags
    const showExpandColumn = expandTrigger !== EXPAND_TRIGGERS.NONE;
    const showSelectionColumn = enableSelection;

    // Loading state logic
    const showFullLoading = isLoading && isFirstLoad;
    const showBodyLoading = isLoading && !isFirstLoad;

    // Event handlers
    const handleExpandClick = useCallback(
        (rowId: string, e: React.MouseEvent) => {
            if (e) {
                e.stopPropagation();
            }
            if (isControlledExpand && onExpandToggle) {
                onExpandToggle(rowId);
            } else {
                setInternalExpandedRows((prev) => {
                    const next = new Set(prev);
                    if (next.has(rowId)) {
                        next.delete(rowId);
                    } else {
                        next.add(rowId);
                    }
                    return next;
                });
            }
        },
        [isControlledExpand, onExpandToggle]
    );

    const handleRowClick = useCallback(
        (row: any, rowId: string) => {
            if (expandTrigger === EXPAND_TRIGGERS.ROW && onExpandToggle) {
                onExpandToggle(rowId);
            }
            if (onRowClick) {
                onRowClick(row);
            }
        },
        [expandTrigger, onExpandToggle, onRowClick]
    );

    const handleSort = useCallback(
        (columnId: string, direction: "asc" | "desc" | null = null) => {
            if (!onSortChange) return;

            if (direction) {
                onSortChange(columnId, direction);
            } else {
                const isCurrentSort = sortConfig?.columnId === columnId;
                const newDirection = isCurrentSort
                    ? sortConfig!.direction === SORT_DIRECTIONS.ASC
                        ? SORT_DIRECTIONS.DESC
                        : SORT_DIRECTIONS.ASC
                    : SORT_DIRECTIONS.DESC;
                onSortChange(columnId, newDirection);
            }
        },
        [onSortChange, sortConfig]
    );

    const handleSelectAll = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (!enableSelection || !onSelectionChange) return;

            const newSelected = new Set(selectedRowsSet);
            if (event.target.checked) {
                rows.forEach((row) => {
                    const rowId = row.id ?? rows.indexOf(row);
                    newSelected.add(rowId);
                });
            } else {
                rows.forEach((row) => {
                    const rowId = row.id ?? rows.indexOf(row);
                    newSelected.delete(rowId);
                });
            }
            onSelectionChange(newSelected);
        },
        [enableSelection, onSelectionChange, rows, selectedRowsSet]
    );

    const handleRowSelect = useCallback(
        (rowId: string, event: React.MouseEvent | React.ChangeEvent) => {
            if (!enableSelection || !onSelectionChange) return;
            event.stopPropagation();

            const newSelected = new Set(selectedRowsSet);
            if (newSelected.has(rowId)) {
                newSelected.delete(rowId);
            } else {
                newSelected.add(rowId);
            }
            onSelectionChange(newSelected);
        },
        [enableSelection, onSelectionChange, selectedRowsSet]
    );

    const handleColumnVisibilityChange = useCallback(
        (newHiddenColumns: Set<string>) => {
            if (onColumnVisibilityChange) {
                onColumnVisibilityChange(newHiddenColumns);
            }
        },
        [onColumnVisibilityChange]
    );

    const handleColumnOrderChange = useCallback(
        (newOrder: string[]) => {
            if (onColumnOrderChange) {
                onColumnOrderChange(newOrder);
            }
        },
        [onColumnOrderChange]
    );

    const handleColumnPinningChange = useCallback(
        (columnId: string, position: "left" | "right" | null) => {
            if (!onColumnPinningChange) return;

            const newPinned = { ...pinnedColumns };

            if (position === null) {
                // Unpin and restore original position
                newPinned.left = newPinned.left.filter((id) => id !== columnId);
                newPinned.right = newPinned.right.filter((id) => id !== columnId);

                if (onColumnOrderChange && columnOriginalPositions[columnId] !== undefined) {
                    const currentOrder =
                        columnOrder ||
                        normalizedColumns.all.map((col) => col.id).filter(Boolean);
                    const newOrder = [...currentOrder];

                    const currentIndex = newOrder.indexOf(columnId);
                    if (currentIndex !== -1) {
                        newOrder.splice(currentIndex, 1);
                    }

                    const originalIndex = columnOriginalPositions[columnId];
                    if (originalIndex !== undefined) {
                        newOrder.splice(originalIndex, 0, columnId);
                        onColumnOrderChange(newOrder);
                    }

                    setColumnOriginalPositions((prev) => {
                        const updated = { ...prev };
                        delete updated[columnId];
                        return updated;
                    });
                }
            } else {
                // Store original position before pinning
                const wasPinned = newPinned.left.includes(columnId)
                if (!wasPinned && onColumnOrderChange) {
                    const currentOrder =
                        columnOrder ||
                        normalizedColumns.all.map((col) => col.id).filter(Boolean);
                    const currentIndex = currentOrder.indexOf(columnId);
                    if (currentIndex !== -1 && !columnOriginalPositions[columnId]) {
                        setColumnOriginalPositions((prev) => ({
                            ...prev,
                            [columnId]: currentIndex,
                        }));
                    }
                }

                // Remove from all positions first
                newPinned.left = newPinned.left.filter((id) => id !== columnId);
                newPinned.right = newPinned.right.filter((id) => id !== columnId);

                // Add to new position
                if (position === "left") {
                    newPinned.left.push(columnId);
                } else if (position === "right") {
                    newPinned.right.push(columnId);
                }
            }

            onColumnPinningChange(newPinned);
        },
        [
            onColumnPinningChange,
            pinnedColumns,
            columnOrder,
            normalizedColumns,
            columnOriginalPositions,
            onColumnOrderChange,
        ]
    );

    const handleClearSort = useCallback(() => {
        if (onSortChange) {
            onSortChange(null as any, null);
        }
    }, [onSortChange]);

    // Drag and drop handlers
    const handleHeaderDragStart = useCallback(
        (e: React.DragEvent, columnId: string) => {
            if (!enableColumnReorder) return;
            setDraggedColumnId(columnId);
            e.dataTransfer.effectAllowed = DRAG_DROP.EFFECT_ALLOWED as any;
            e.dataTransfer.setData(DRAG_DROP.DATA_TYPE, columnId);
        },
        [enableColumnReorder]
    );

    const handleHeaderDragOver = useCallback(
        (e: React.DragEvent, columnId: string) => {
            if (!enableColumnReorder || !draggedColumnId || draggedColumnId === columnId)
                return;
            e.preventDefault();
            e.dataTransfer.dropEffect = DRAG_DROP.EFFECT_ALLOWED as any;
            setDragOverColumnId(columnId);
        },
        [enableColumnReorder, draggedColumnId]
    );

    const handleHeaderDragLeave = useCallback(() => {
        setDragOverColumnId(null);
    }, []);

    const handleHeaderDrop = useCallback(
        (e: React.DragEvent, targetColumnId: string) => {
            if (!enableColumnReorder || !draggedColumnId || !onColumnOrderChange) return;
            e.preventDefault();

            const visibleColumns = normalizedColumns.all.filter(
                (col) => !hiddenColumnsSet.has(col.id)
            );

            const currentOrder =
                columnOrder || visibleColumns.map((col) => col.id).filter(Boolean);
            const fromIndex = currentOrder.indexOf(draggedColumnId);
            const toIndex = currentOrder.indexOf(targetColumnId);

            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
                setDraggedColumnId(null);
                setDragOverColumnId(null);
                return;
            }

            const newOrder = [...currentOrder];
            const [removed] = newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, removed);

            onColumnOrderChange(newOrder);
            setDraggedColumnId(null);
            setDragOverColumnId(null);
        },
        [
            enableColumnReorder,
            draggedColumnId,
            onColumnOrderChange,
            columnOrder,
            normalizedColumns,
            hiddenColumnsSet,
        ]
    );

    const handleHeaderDragEnd = useCallback(() => {
        setDraggedColumnId(null);
        setDragOverColumnId(null);
    }, []);

    const handleCloseColumnVisibility = useCallback(() => {
        setColumnVisibilityOpen(false);
        setColumnVisibilityAnchor(null);
        if (onColumnVisibilityClose) {
            onColumnVisibilityClose();
        }
    }, [onColumnVisibilityClose]);

    // Render functions
    const renderFilterCell = useCallback(
        (column: TableColumn) => {
            if (!columnFilterConfig?.enable) return null;

            const colConfig = columnFilterConfig.columns?.[column.id];
            if (!colConfig) return null;

            const hasValue = !!columnFilters[column.id];

            // Global toolbar filter mode (icon se): sabhi columns ke filters dikhne chahiye
            const isGlobalFilterMode =
                !!showFilterRow && !effectiveActiveFilterColumnId;

            // Single / per-column mode:
            // Column ka filter input sirf tab dikhao jab:
            // - us column ka filter explicitly enable kiya gaya ho (Filter by click se), YA
            // - us column me already koi value ho
            if (!isGlobalFilterMode && !filterEnabledColumns.has(column.id) && !hasValue) {
                return null;
            }

            const value = columnFilters[column.id] || "";

            // Dropdown filter
            if (colConfig.type === FILTER_TYPES.DROPDOWN) {
                return (
                    <Select
                        className="table-header-select"
                        fullWidth
                        size="small"
                        value={value}
                        onChange={(e) => onColumnFilterChange?.(column.id, e.target.value)}
                        displayEmpty
                    >
                        <MenuItem value="">
                            <em>All</em>
                        </MenuItem>
                        {(colConfig.options || []).map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                );
            }

            // Search input (default)
            return (
                <TextField
                    fullWidth
                    size="small"
                    placeholder={`Filter ${column.label}`}
                    value={value}
                    onChange={(e) => onColumnFilterChange?.(column.id, e.target.value)}
                    InputProps={{
                        endAdornment: value && (
                            <IconButton
                                size="small"
                                onClick={() => onColumnFilterChange?.(column.id, "")}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        ),
                    }}
                />
            );
        },
        [
            columnFilterConfig,
            effectiveActiveFilterColumnId,
            columnFilters,
            filterEnabledColumns,
            onColumnFilterChange,
            showFilterRow,
        ]
    );

    const renderColumnHeader = useCallback(
        (column: TableColumn) => {
            const isSortable = column.sortable && onSortChange;
            const isSorted = sortConfig?.columnId === column.id;
            const sortDirection = isSorted ? sortConfig!.direction : SORT_DIRECTIONS.ASC;

            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                            getColumnAlign(column) === "right" ? "flex-end" : "flex-start",
                        gap: 0.5,
                    }}
                >
                    {/* Drag Icon */}
                    {enableColumnReorder && column.draggable !== false && (
                        <IconButton
                            size="small"
                            draggable
                            onDragStart={(e) => {
                                e.stopPropagation();
                                handleHeaderDragStart(e, column.id);
                            }}
                            onDragEnd={(e) => {
                                e.stopPropagation();
                                handleHeaderDragEnd();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                padding: "2px",
                                opacity: 0.6,
                                cursor: "grab",
                                "&:active": { cursor: "grabbing" },
                                "&:hover": { opacity: 1 },
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.667 4a.667.667 0 1 0 0-1.333.667.667 0 0 0 0 1.333m0 4.667a.667.667 0 1 0 0-1.334.667.667 0 0 0 0 1.334m0 4.666a.667.667 0 1 0 0-1.333.667.667 0 0 0 0 1.333M5.333 4a.667.667 0 1 0 0-1.333.667.667 0 0 0 0 1.333m0 4.667a.667.667 0 1 0 0-1.334.667.667 0 0 0 0 1.334m0 4.666a.667.667 0 1 0 0-1.333.667.667 0 0 0 0 1.333" stroke="#a1a1aa" strokeWidth="1.333" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </IconButton>
                    )}
                    <Box className={tableHeadClassName}>{column.label}</Box>
                    {isSortable && (
                        <Box
                            className="reusable-table-sort-icon"
                            sx={{ ml: 0.5, cursor: "pointer" }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSort(column.id);
                            }}
                        >
                            {sortDirection === SORT_DIRECTIONS.ASC ? (
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M2.667 11.333h8M2.667 8h6m-6-3.333h4m5.333 4V3.333m0 0 2 2m-2-2-2 2"
                                        stroke="#181d27"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M2.667 11.333h4M2.667 8h6M12 7.333v5.334m0 0 2-2m-2 2-2-2m-7.333-6h8"
                                        stroke="#181d27"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                        </Box>
                    )}
                    {enableColumnActions && column.showColumnActions !== false && (
                        <ColumnHeaderMenu
                            column={column}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            onClearSort={handleClearSort}
                            onPin={handleColumnPinningChange}
                            onFilter={(col, clear) => {
                                if (clear) {
                                    const hasValue = !!columnFilters[col.id];
                                    const otherActiveFiltersByValue = Object.keys(columnFilters).filter(
                                        (id) => id !== col.id && !!columnFilters[id]
                                    );
                                    const hasOtherEnabledColumns = filterEnabledColumns.size > 1;

                                    // 1️⃣ value thi tabhi API trigger
                                    if (hasValue) {
                                        onColumnFilterChange(col.id, "");
                                    }

                                    // 2️⃣ sirf isi column ka mode close
                                    if (activeFilterColumnId === col.id) {
                                        onActiveFilterColumnIdChange?.(null);
                                    }

                                    // 3️⃣ is column ko enabled list se hatao
                                    setFilterEnabledColumns((prev) => {
                                        const next = new Set(prev);
                                        next.delete(col.id);
                                        return next;
                                    });

                                    // 4️⃣ Filter row sirf tab band karo jab:
                                    //    - koi aur column enabled nahi bacha
                                    //    - aur kisi aur column me value bhi nahi hai
                                    if (!hasOtherEnabledColumns && otherActiveFiltersByValue.length === 0) {
                                        onFilterRowToggle?.({ mode: "single", columnId: col.id, open: false });
                                    }

                                    return;
                                }

                                // Yahan par user ne "Filter by ..." click kiya
                                // -> is column ko enabled set me add karo
                                setFilterEnabledColumns((prev) => {
                                    const next = new Set(prev);
                                    next.add(col.id);
                                    return next;
                                });

                                onActiveFilterColumnIdChange?.(col.id);
                                onFilterRowToggle?.({ mode: "single", columnId: col.id, open: true });

                                if (onActiveFilterColumnIdChange) {
                                    onActiveFilterColumnIdChange(col.id);
                                } else {
                                    setInternalActiveFilterColumnId(col.id);
                                }

                                if (!showFilterRow && onFilterRowToggle) {
                                    onFilterRowToggle({ mode: "single", columnId: col.id, open: true });
                                }
                            }}
                            columnFilters={columnFilters}
                            pinnedColumns={pinnedColumns}
                            enableColumnPinning={enableColumnPinning}
                            enableColumnFilters={enableColumnFilters}
                            activeFilterColumnId={effectiveActiveFilterColumnId}
                            showFilterRow={showFilterRow}
                            enabledFilterColumnIds={filterEnabledColumns}
                        />
                    )}
                </Box>
            );
        },
        [
            onSortChange,
            sortConfig,
            enableColumnReorder,
            handleHeaderDragStart,
            handleHeaderDragEnd,
            handleSort,
            getColumnAlign,
            enableColumnActions,
            handleClearSort,
            handleColumnPinningChange,
            onColumnFilterChange,
            onActiveFilterColumnIdChange,
            showFilterRow,
            onFilterRowToggle,
            columnFilters,
            pinnedColumns,
            enableColumnPinning,
            enableColumnFilters,
        ]
    );

    const renderGroupedHeader = useCallback(() => {
        if (!hasGroupedColumns(columns)) return null;

        const headerRows: React.ReactNode[] = [];
        const maxDepth = getMaxColumnDepth(columns);

        // First row: Parent columns
        headerRows.push(
            <TableRow key="header-parent" className={tableHeadClassName}>
                {showSelectionColumn && (
                    <TableCell
                        rowSpan={maxDepth}
                        className="reusable-table-header-cell"
                        style={{ width: COLUMN_WIDTHS.SELECTION }}
                        align="center"
                    >
                        {enableSelection && (
                            <Checkbox
                                indeterminate={isIndeterminate}
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                size="small"
                            />
                        )}
                    </TableCell>
                )}
                {showExpandColumn && (
                    <TableCell
                        rowSpan={maxDepth}
                        className="reusable-table-header-cell reusable-table-header-cell-expand"
                        style={{ width: COLUMN_WIDTHS.EXPAND }}
                    />
                )}
                {normalizedColumns.all.map((column) => {
                    if (column.children && column.children.length > 0) {
                        return (
                            <TableCell
                                key={column.id}
                                colSpan={column.children.length}
                                className="reusable-table-header-cell reusable-table-header-cell-group"
                                style={{
                                    width: COLUMN_WIDTHS.DEFAULT,
                                    textAlign: getColumnAlign(column),
                                }}
                                align={getColumnAlign(column)}
                            >
                                {column.renderHeader
                                    ? column.renderHeader(column)
                                    : column.label}
                            </TableCell>
                        );
                    }
                    return null;
                })}
            </TableRow>
        );

        // Second row: Child columns
        headerRows.push(
            <TableRow key="header-child" className="reusable-table-header">
                {normalizedColumns.all.map((column) => {
                    if (column.children && column.children.length > 0) {
                        return column.children.map((child) => (
                            <TableCell
                                key={child.id}
                                className={`reusable-table-header-cell ${child.sortable && onSortChange
                                    ? "reusable-table-header-cell-sortable"
                                    : ""
                                    }`}
                                style={{
                                    width: getColumnWidth(child),
                                    textAlign: getColumnAlign(child),
                                    borderLeft:
                                        dragOverColumnId === child.id ? "3px solid #ff008e" : "none",
                                }}
                                align={getColumnAlign(child)}
                                onDragOver={(e) => handleHeaderDragOver(e, child.id)}
                                onDragLeave={handleHeaderDragLeave}
                                onDrop={(e) => handleHeaderDrop(e, child.id)}
                            >
                                {renderColumnHeader(child)}
                            </TableCell>
                        ));
                    }
                    return null;
                })}
            </TableRow>
        );

        // Filter row for grouped columns
        if (enableColumnFilters && showFilterRow) {
            headerRows.push(
                <TableRow key="filter-row" className="reusable-table-filter-row">
                    {showSelectionColumn && <TableCell />}
                    {showExpandColumn && <TableCell />}
                    {normalizedColumns.all.map((column) => {
                        if (column.children && column.children.length > 0) {
                            return column.children.map((child) => (
                                <TableCell key={child.id} sx={{ p: 1 }}>
                                    {renderFilterCell(child)}
                                </TableCell>
                            ));
                        }
                        return (
                            <TableCell key={column.id} sx={{ p: 1 }}>
                                {renderFilterCell(column)}
                            </TableCell>
                        );
                    })}
                </TableRow>
            );
        }

        return headerRows;
    }, [
        columns,
        showSelectionColumn,
        showExpandColumn,
        enableSelection,
        isIndeterminate,
        isAllSelected,
        handleSelectAll,
        normalizedColumns,
        getColumnAlign,
        getColumnWidth,
        onSortChange,
        dragOverColumnId,
        handleHeaderDragOver,
        handleHeaderDragLeave,
        handleHeaderDrop,
        renderColumnHeader,
        enableColumnFilters,
        showFilterRow,
        renderFilterCell,
    ]);

    const renderHeaderCell = useCallback(
        (column: TableColumn, isPinned = false, pinPosition: "left" | "right" | null = null) => {
            const isSortable = column.sortable && onSortChange;
            const isSorted = sortConfig?.columnId === column.id;
            const sortDirection = isSorted ? sortConfig!.direction : SORT_DIRECTIONS.ASC;

            const pinnedStyles = isPinned && pinPosition
                ? {
                    position: "sticky" as const,
                    [pinPosition]: 0,
                    zIndex: Z_INDEX.PINNED_COLUMN,
                    backgroundColor: "white",
                }
                : {};

            return (
                <TableCell
                    key={column.id}
                    data-column-id={column.id}
                    className={`reusable-table-header-cell ${isPinned
                        ? `reusable-table-header-cell-pinned-${pinPosition}`
                        : ""
                        } ${isSortable ? "reusable-table-header-cell-sortable" : ""} ${draggedColumnId === column.id ? "dragging" : ""
                        } ${dragOverColumnId === column.id ? "drag-over" : ""}`}
                    onDragOver={(e) => handleHeaderDragOver(e, column.id)}
                    onDragLeave={handleHeaderDragLeave}
                    onDrop={(e) => handleHeaderDrop(e, column.id)}
                    style={{
                        width: getColumnWidth(column),
                        textAlign: getColumnAlign(column),
                        opacity: draggedColumnId === column.id ? 0.5 : 1,
                        borderLeft:
                            dragOverColumnId === column.id ? "3px solid #ff008e" : "none",
                        ...pinnedStyles,
                    }}
                    // title={column.tooltip || ""}
                    align={getColumnAlign(column)}
                >
                    {column.renderHeader
                        ? column.renderHeader(column, sortDirection)
                        : renderColumnHeader(column)}
                </TableCell>
            );
        },
        [
            onSortChange,
            sortConfig,
            getColumnWidth,
            getColumnAlign,
            draggedColumnId,
            dragOverColumnId,
            handleHeaderDragOver,
            handleHeaderDragLeave,
            handleHeaderDrop,
            renderColumnHeader,
        ]
    );

    const renderDataCell = useCallback(
        (row: any, column: TableColumn, isPinned = false, pinPosition: "left" | "right" | null = null) => {
            const pinnedStyles = isPinned && pinPosition
                ? {
                    position: "sticky" as const,
                    [pinPosition]: 0,
                    zIndex: Z_INDEX.PINNED_CELL,
                    backgroundColor: "white",
                }
                : {};

            return (
                <TableCell
                    key={column.id}
                    className={`reusable-table-cell ${isPinned ? `reusable-table-cell-pinned-${pinPosition}` : ""
                        }`}
                    style={{
                        width: getColumnWidth(column),
                        textAlign: getColumnAlign(column),
                        ...pinnedStyles,
                    }}
                    align={getColumnAlign(column)}
                >
                    {renderCell ? renderCell(row, column) : row[column.id] || ""}
                </TableCell>
            );
        },
        [getColumnWidth, getColumnAlign, renderCell]
    );

    // Error State
    if (isError) {
        if (renderError) {
            return renderError();
        }
        return (
            <Box className="reusable-table-container">
                <Box
                    className="reusable-table-error"
                    sx={{ p: 4, textAlign: "center" }}
                >
                    <Typography color="error">{DEFAULT_MESSAGES.ERROR_LOADING}</Typography>
                </Box>
            </Box>
        );
    }

    // Full Loading State
    if (showFullLoading) {
        if (renderLoading) {
            return renderLoading();
        }
        return (
            <Box className="reusable-table-container">
                <Box
                    className="reusable-table-loading"
                    sx={{ p: 4, textAlign: "center" }}
                >
                    {/* <CircularProgress /> */}
                    <CommonLoader className='table-loader' />
                </Box>
            </Box>
        );
    }

    const hasGroupedCols = hasGroupedColumns(columns);

    return (
        <Box className="reusable-table-container">
            <TableContainer>
                <Table className={`reusable-table ${type || ""}`}>
                    <TableHead>
                        {hasGroupedCols ? (
                            renderGroupedHeader()
                        ) : (
                            <>
                                <TableRow className="reusable-table-header">
                                    {showSelectionColumn && (
                                        <TableCell
                                            className="reusable-table-header-cell"
                                            style={{ width: COLUMN_WIDTHS.SELECTION }}
                                            align="center"
                                        >
                                            {enableSelection && (
                                                <Checkbox
                                                    indeterminate={isIndeterminate}
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                    )}
                                    {showExpandColumn && (
                                        <TableCell
                                            className="reusable-table-header-cell reusable-table-header-cell-expand"
                                            style={{ width: COLUMN_WIDTHS.EXPAND }}
                                        />
                                    )}
                                    {normalizedColumns.leftPinned.map((column) =>
                                        renderHeaderCell(column, true, "left")
                                    )}
                                    {normalizedColumns.unpinned.map((column) =>
                                        renderHeaderCell(column)
                                    )}
                                    {normalizedColumns.rightPinned.map((column) =>
                                        renderHeaderCell(column, true, "right")
                                    )}
                                </TableRow>
                                {enableColumnFilters && showFilterRow && (
                                    <TableRow className="reusable-table-filter-row">
                                        {showSelectionColumn && <TableCell />}
                                        {showExpandColumn && <TableCell />}
                                        {normalizedColumns.leftPinned.map((column) => (
                                            <TableCell
                                                key={column.id}
                                                sx={{
                                                    p: 1,
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: Z_INDEX.PINNED_COLUMN,
                                                    backgroundColor: "white",
                                                }}
                                            >
                                                {renderFilterCell(column)}
                                            </TableCell>
                                        ))}
                                        {normalizedColumns.unpinned.map((column) => {
                                            if (column.children && column.children.length > 0) {
                                                return column.children.map((child) => (
                                                    <TableCell key={child.id} sx={{ p: 1 }}>
                                                        {renderFilterCell(child)}
                                                    </TableCell>
                                                ));
                                            }
                                            return (
                                                <TableCell key={column.id} sx={{ p: 1 }}>
                                                    {renderFilterCell(column)}
                                                </TableCell>
                                            );
                                        })}
                                        {normalizedColumns.rightPinned.map((column) => (
                                            <TableCell
                                                key={column.id}
                                                sx={{
                                                    p: 1,
                                                    position: "sticky",
                                                    right: 0,
                                                    zIndex: Z_INDEX.PINNED_COLUMN,
                                                    backgroundColor: "white",
                                                }}
                                            >
                                                {renderFilterCell(column)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableHead>
                    <TableBody className="reusable-table-body">
                        {showBodyLoading && (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        (showSelectionColumn ? 1 : 0) +
                                        (showExpandColumn ? 1 : 0) +
                                        visibleColumns.length
                                    }
                                    align="center"
                                    sx={{ py: 4 }}
                                >
                                    {/* <CircularProgress size={24} /> */}
                                    <CommonLoader className='table-loader' />
                                </TableCell>
                            </TableRow>
                        )}
                        {/* Empty State */}
                        {!showBodyLoading && (!rows || rows.length === 0) && (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        (showSelectionColumn ? 1 : 0) +
                                        (showExpandColumn ? 1 : 0) +
                                        visibleColumns.length
                                    }
                                    align="center"
                                    sx={{ py: 4 }}
                                >
                                    {renderEmpty ? (
                                        renderEmpty()
                                    ) : (
                                        <Typography color="text.secondary">{emptyMessage}</Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                        {/* Summary Row at Top */}
                        {!showBodyLoading &&
                            rows &&
                            rows.length > 0 &&
                            enableSummaryRow &&
                            summaryRowPosition === SUMMARY_ROW_POSITIONS.TOP &&
                            renderSummaryRow && (
                                <TableRow className="reusable-table-summary-row">
                                    {showSelectionColumn && <TableCell />}
                                    {showExpandColumn && <TableCell />}
                                    {normalizedColumns.all.map((column) => {
                                        if (column.children && column.children.length > 0) {
                                            return column.children.map((child) => (
                                                <TableCell key={child.id} align={getColumnAlign(child)}>
                                                    {renderSummaryRow(rows, child)}
                                                </TableCell>
                                            ));
                                        }
                                        return (
                                            <TableCell key={column.id} align={getColumnAlign(column)}>
                                                {renderSummaryRow(rows, column)}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            )}

                        {/* Data Rows */}
                        {!showBodyLoading &&
                            rows.map((row, rowIndex) => {
                                const rowId = row.id ?? rowIndex;
                                const isExpanded = expandedRowsSet.has(rowId);
                                const isSelected = selectedRowsSet.has(rowId);

                                return (
                                    <React.Fragment key={rowId}>
                                        <TableRow
                                            className={`reusable-table-row ${isExpanded ? "reusable-table-row-expanded" : ""
                                                } ${expandTrigger === EXPAND_TRIGGERS.ROW
                                                    ? "reusable-table-row-clickable"
                                                    : ""
                                                } ${isDense ? "dense-row" : "normal-row"} ${isSelected ? "reusable-table-row-selected" : ""
                                                }`}
                                            hover
                                            onClick={() => handleRowClick(row, rowId)}
                                            selected={isSelected}
                                        >
                                            {showSelectionColumn && (
                                                <TableCell
                                                    className="reusable-table-cell reusable-table-cell-selection"
                                                    style={{ width: COLUMN_WIDTHS.SELECTION }}
                                                    align="center"
                                                    onClick={(e) => handleRowSelect(rowId, e)}
                                                >
                                                    {enableSelection && (
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onChange={(e) => handleRowSelect(rowId, e)}
                                                            size="small"
                                                        />
                                                    )}
                                                </TableCell>
                                            )}
                                            {showExpandColumn && (
                                                <TableCell
                                                    className="reusable-table-cell reusable-table-cell-expand"
                                                    style={{ width: COLUMN_WIDTHS.EXPAND }}
                                                    onClick={(e) => {
                                                        if (expandTrigger === EXPAND_TRIGGERS.ICON) {
                                                            handleExpandClick(rowId, e);
                                                        }
                                                    }}
                                                >
                                                    {expandTrigger === EXPAND_TRIGGERS.ICON && (
                                                        <IconButton
                                                            className={`reusable-table-expand-button ${isExpanded
                                                                ? "reusable-table-expand-button-expanded"
                                                                : ""
                                                                }`}
                                                            onClick={(e) => handleExpandClick(rowId, e)}
                                                            size="medium"
                                                        >
                                                            <KeyboardArrowDownIcon sx={{
                                                                fontSize: 28,
                                                                width: 28,
                                                                height: 28,
                                                            }} />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            )}
                                            {normalizedColumns.leftPinned.map((column) =>
                                                renderDataCell(row, column, true, "left")
                                            )}
                                            {normalizedColumns.unpinned.map((column) =>
                                                renderDataCell(row, column)
                                            )}
                                            {normalizedColumns.rightPinned.map((column) =>
                                                renderDataCell(row, column, true, "right")
                                            )}
                                        </TableRow>

                                        {/* Expanded Content */}
                                        {showExpandColumn && isExpanded && (
                                            <TableRow className="reusable-table-row-expanded-content">
                                                <TableCell
                                                    colSpan={
                                                        (showSelectionColumn ? 1 : 0) +
                                                        (showExpandColumn ? 1 : 0) +
                                                        visibleColumns.length
                                                    }
                                                    className={expandCellClassName}
                                                >
                                                    {renderExpandedContent && renderExpandedContent(row)}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}

                        {/* Summary Row at Bottom */}
                        {!showBodyLoading &&
                            enableSummaryRow &&
                            summaryRowPosition === SUMMARY_ROW_POSITIONS.BOTTOM &&
                            renderSummaryRow && (
                                <TableRow className="reusable-table-summary-row">
                                    {showSelectionColumn && <TableCell />}
                                    {showExpandColumn && <TableCell />}
                                    {normalizedColumns.all.map((column) => {
                                        if (column.children && column.children.length > 0) {
                                            return column.children.map((child) => (
                                                <TableCell key={child.id} align={getColumnAlign(child)}>
                                                    {renderSummaryRow(rows, child)}
                                                </TableCell>
                                            ));
                                        }
                                        return (
                                            <TableCell key={column.id} align={getColumnAlign(column)}>
                                                {renderSummaryRow(rows, column)}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Column Visibility Panel */}
            {columnVisibilityConfig?.enable === true && (
                <ColumnVisibilityPanel
                    open={Boolean(columnVisibilityAnchorEl)}
                    anchorEl={columnVisibilityAnchorEl}
                    onClose={handleCloseColumnVisibility}
                    columns={columns}
                    allowedColumnIds={columnVisibilityConfig.columns || null}
                    hiddenColumns={hiddenColumnsSet}
                    onVisibilityChange={handleColumnVisibilityChange}
                    columnOrder={columnOrder}
                    onOrderChange={handleColumnOrderChange}
                    enableColumnReorder={columnVisibilityConfig.enableReorder === true}
                />
            )}
        </Box>
    );
}
export default CommonTable;
