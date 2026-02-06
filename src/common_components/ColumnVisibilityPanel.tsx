import React, { useState, useMemo } from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { TableColumn } from "./tableTypes";

// Helper: Flatten all columns (including children) for visibility panel
const flattenColumnsForPanel = (columns: TableColumn[]) => {
    const flat: TableColumn[] = [];
    columns.forEach((col) => {
        if (col.children && col.children.length > 0) {
            // Add parent (non-hideable usually)
            flat.push({ ...col });
            // Add children
            col.children.forEach((child) => {
                flat.push({ ...child, parentId: col.id, isChild: true });
            });
        } else {
            flat.push(col);
        }
    });
    return flat;
};

interface ColumnVisibilityPanelProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    columns?: TableColumn[];
    allowedColumnIds?: string[] | null;
    hiddenColumns?: Set<string>;
    onVisibilityChange?: (hiddenColumns: Set<string>) => void;
    columnOrder?: string[] | null;
    onOrderChange?: (newOrder: string[]) => void;
    enableColumnReorder?: boolean;
}

function ColumnVisibilityPanel({
    open,
    anchorEl,
    onClose,
    columns = [],
    allowedColumnIds = null,
    hiddenColumns = new Set(),
    onVisibilityChange,
    columnOrder = null,
    onOrderChange,
    enableColumnReorder = false,
}: ColumnVisibilityPanelProps) {
    const [searchText, setSearchText] = useState("");
    const [tabValue, setTabValue] = useState(2);
    const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
    const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

    const allColumns = useMemo(() => {
        const flat = flattenColumnsForPanel(columns);

        if (!allowedColumnIds || allowedColumnIds.length === 0) {
            return flat;
        }

        return flat.filter(
            (col) =>
                col.id &&
                allowedColumnIds.includes(col.id) &&
                col.hideable !== false
        );
    }, [columns, allowedColumnIds]);

    // Sort columns based on columnOrder if available
    const sortedColumns = useMemo(() => {
        if (!columnOrder || columnOrder.length === 0) {
            return allColumns;
        }

        // Create a map for quick lookup
        const columnMap = new Map(allColumns.map(col => [col.id, col]));
        const orderedColumns: TableColumn[] = [];
        const unorderedColumns: TableColumn[] = [];

        // First, add columns in the order specified by columnOrder
        columnOrder.forEach(colId => {
            if (columnMap.has(colId)) {
                orderedColumns.push(columnMap.get(colId)!);
                columnMap.delete(colId);
            }
        });

        // Then, add any remaining columns that weren't in columnOrder
        columnMap.forEach(col => {
            unorderedColumns.push(col);
        });

        return [...orderedColumns, ...unorderedColumns];
    }, [allColumns, columnOrder]);

    const filteredColumns = useMemo(() => {
        if (!searchText.trim()) return sortedColumns;
        const lowerSearch = searchText.toLowerCase();
        return sortedColumns.filter(
            (col) =>
                col.label?.toLowerCase().includes(lowerSearch) ||
                col.id?.toLowerCase().includes(lowerSearch)
        );
    }, [sortedColumns, searchText]);

    const handleToggleVisibility = (columnId: string) => {
        const newHidden = new Set(hiddenColumns);
        if (newHidden.has(columnId)) {
            newHidden.delete(columnId);
        } else {
            newHidden.add(columnId);
        }
        if (onVisibilityChange) {
            onVisibilityChange(newHidden);
        }
    };

    const handleHideAll = () => {
        const hideableColumns = allColumns.filter(
            (col) => col.hideable !== false // && !col.isParent // isParent not on type yet, mostly OK
        );
        const newHidden = new Set(
            hideableColumns.map((col) => col.id).filter(Boolean)
        );
        if (onVisibilityChange) {
            onVisibilityChange(newHidden);
        }
    };

    const handleShowAll = () => {
        if (onVisibilityChange) {
            onVisibilityChange(new Set());
        }
    };

    const handleResetOrder = () => {
        if (onOrderChange) {
            const defaultOrder = allColumns
                .filter((col) => !col.isChild)
                .map((col) => col.id)
                .filter(Boolean);
            onOrderChange(defaultOrder);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        if (newValue === 0) {
            handleHideAll();
        } else if (newValue === 1) {
            handleResetOrder();
        } else if (newValue === 2) {
            handleShowAll();
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, columnId: string) => {
        if (!enableColumnReorder) return;
        setDraggedColumnId(columnId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", columnId);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        if (!enableColumnReorder || !draggedColumnId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverColumnId(columnId);
    };

    const handleDragLeave = () => {
        setDragOverColumnId(null);
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
        if (!enableColumnReorder || !draggedColumnId || !onOrderChange) return;
        e.preventDefault();

        const popupColumnIds = filteredColumns
            .filter(
                (col) =>
                    // !col.isParent && // Types
                    !col.isChild &&
                    col.hideable !== false
            )
            .map((col) => col.id);

        const fromIndex = popupColumnIds.indexOf(draggedColumnId);
        const toIndex = popupColumnIds.indexOf(targetColumnId);

        if (fromIndex === -1 || toIndex === -1) {
            setDraggedColumnId(null);
            setDragOverColumnId(null);
            return;
        }

        const reorderedPopupIds = [...popupColumnIds];
        const [moved] = reorderedPopupIds.splice(fromIndex, 1);
        reorderedPopupIds.splice(toIndex, 0, moved);

        const finalOrder: string[] = [];
        const existingOrder =
            columnOrder ||
            columns.map((c) => c.id).filter(Boolean);

        existingOrder.forEach((id) => {
            if (!popupColumnIds.includes(id)) {
                finalOrder.push(id);
            } else {
                const nextId = reorderedPopupIds.shift();
                if (nextId) finalOrder.push(nextId);
            }
        });

        onOrderChange(finalOrder);

        setDraggedColumnId(null);
        setDragOverColumnId(null);
    };

    const handleDragEnd = () => {
        setDraggedColumnId(null);
        setDragOverColumnId(null);
    };

    return (
        <Popover
            className="popup-hide-show-column"
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
            }}
            transformOrigin={{
                vertical: "top",
                horizontal: "right",
            }}
            PaperProps={{
                sx: {
                    width: 320,
                    maxHeight: 500,
                    mt: 1,
                },
            }}
        >
            <div className="popup-card-container">
                <Tabs
                    className="popup-hide-show-tab-container"
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                        mb: 2,
                        minHeight: "36px",
                        "& .MuiTab-root": {
                            minHeight: "36px",
                            fontSize: "12px",
                            textTransform: "none",
                            padding: "8px 12px",
                        },
                    }}
                >
                    <Tab label="Hide All" />
                    <Tab label="Reset Order" />
                    <Tab label="Show All" />
                </Tabs>

                <div className="hide-show-search-input">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search Column Header"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">

                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="#717680" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </InputAdornment>
                            ),
                        }}
                    />
                </div>

                <Box
                    sx={{
                        maxHeight: 300,
                        overflowY: "auto",
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            backgroundColor: "#d1d5db",
                            borderRadius: "3px",
                        },
                    }}
                >
                    {filteredColumns.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textAlign: "center", py: 2 }}
                        >
                            No columns found
                        </Typography>
                    ) : (
                        filteredColumns.map((column) => {
                            if (column.children && column.children.length > 0) return null; // Parent check

                            const isHidden = hiddenColumns.has(column.id);
                            const isHideable = column.hideable !== false;

                            if (!isHideable) return null;

                            return (
                                <div className="hide-show-drag-drop-container" key={column.id}>
                                    <Box
                                        draggable={enableColumnReorder}
                                        onDragStart={(e) => handleDragStart(e, column.id)}
                                        onDragOver={(e) => handleDragOver(e, column.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, column.id)}
                                        onDragEnd={handleDragEnd}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            py: 1,
                                            px: 1,
                                            opacity: draggedColumnId === column.id ? 0.5 : 1,
                                            backgroundColor: dragOverColumnId === column.id ? "action.selected" : "transparent",
                                            borderTop: dragOverColumnId === column.id ? "2px solid #ff008e" : "2px solid transparent",
                                            "&:hover": {
                                                backgroundColor: draggedColumnId ? "transparent" : "action.hover",
                                            },
                                            cursor: enableColumnReorder ? "move" : "default",
                                        }}
                                    >
                                        {enableColumnReorder && (
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    cursor: "grab",
                                                    "&:active": { cursor: "grabbing" },
                                                    mr: 0,
                                                    padding: 0
                                                }}
                                            >
                                                <DragIndicatorIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                        <div className="compare-toggle-container normal-switch">
                                            <FormControlLabel className="compare-label"
                                                control={
                                                    <Switch
                                                        className="compare-switch"
                                                        size="medium"
                                                        checked={!isHidden}
                                                        onChange={() => handleToggleVisibility(column.id)}
                                                        sx={{
                                                            "& .MuiSwitch-switchBase.Mui-checked": {
                                                                color: "#ff008e",
                                                            },
                                                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                            {
                                                                backgroundColor: "#ff008e",
                                                            },
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2" sx={{ fontSize: "13px" }}>
                                                        {column.label}
                                                    </Typography>
                                                }
                                                sx={{ flex: 1, m: 0 }}
                                            />
                                        </div>
                                    </Box>
                                </div>
                            );
                        })
                    )}
                </Box>
            </div>
        </Popover>
    );
}

export default ColumnVisibilityPanel;
