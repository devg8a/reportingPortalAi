import React, { useState, useEffect, useCallback, useMemo } from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
// import { FILTER_TYPES } from "./tableConstants"; // Unused in JS file

// Constants
const POPOVER_WIDTH = 280;
const POPOVER_PADDING = 2;

interface FilterOption {
    value: string | number;
    label: string;
}

interface ColumnFilterProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    column: { id: string; label: string } | null;
    filterValue: string;
    onFilterChange: (columnId: string, value: string) => void;
    filterOptions?: Array<FilterOption | string> | null;
}

function ColumnFilter({
    open,
    anchorEl,
    onClose,
    column,
    filterValue,
    onFilterChange,
    filterOptions = null,
}: ColumnFilterProps) {
    const [localValue, setLocalValue] = useState(filterValue || "");

    // Sync local value with prop changes
    useEffect(() => {
        setLocalValue(filterValue || "");
    }, [filterValue]);

    /**
     * Check if filter uses dropdown type
     */
    const isDropdown = useMemo(() => {
        return (
            filterOptions &&
            Array.isArray(filterOptions) &&
            filterOptions.length > 0
        );
    }, [filterOptions]);

    /**
     * Handle filter apply
     */
    const handleApply = useCallback(() => {
        if (onFilterChange && column?.id) {
            onFilterChange(column.id, localValue);
        }
        if (onClose) {
            onClose();
        }
    }, [onFilterChange, onClose, column, localValue]);

    /**
     * Handle filter clear
     */
    const handleClear = useCallback(() => {
        setLocalValue("");
        if (onFilterChange && column?.id) {
            onFilterChange(column.id, "");
        }
        if (onClose) {
            onClose();
        }
    }, [onFilterChange, onClose, column]);

    /**
     * Handle input/select change
     */
    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
            const newValue = event.target.value as string;
            setLocalValue(newValue);

            // For dropdown, apply immediately
            if (isDropdown && onFilterChange && column?.id) {
                onFilterChange(column.id, newValue);
            }
        },
        [isDropdown, onFilterChange, column]
    );

    if (!column || !column.id || !column.label) {
        return null;
    }

    const columnLabel = column.label || "";

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
            }}
            transformOrigin={{
                vertical: "top",
                horizontal: "center",
            }}
            PaperProps={{
                sx: {
                    width: POPOVER_WIDTH,
                    p: POPOVER_PADDING,
                },
            }}
        >
            <Box>
                {/* Header */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <Box sx={{ fontWeight: 600, fontSize: "14px" }}>
                        Filter by {columnLabel}
                    </Box>
                    <IconButton size="small" onClick={onClose} aria-label="Close filter">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Filter Input */}
                {isDropdown && filterOptions ? (
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Select {columnLabel}</InputLabel>
                        <Select
                            value={localValue}
                            onChange={handleChange}
                            label={`Select ${columnLabel}`}
                        >
                            <MenuItem value="">
                                <em>All</em>
                            </MenuItem>
                            {filterOptions.map((option, index) => {
                                const optionValue = typeof option === 'object' ? option.value : option;
                                const optionLabel = typeof option === 'object' ? option.label : option;
                                const key = optionValue || `option-${index}`;

                                return (
                                    <MenuItem key={key} value={optionValue}>
                                        {optionLabel}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                ) : (
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={`Search ${columnLabel}...`}
                        value={localValue}
                        onChange={(e) => handleChange(e)}
                        sx={{ mb: 2 }}
                        autoFocus
                        inputProps={{
                            "aria-label": `Filter ${columnLabel}`,
                        }}
                    />
                )}

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button size="small" onClick={handleClear} aria-label="Clear filter">
                        Clear
                    </Button>
                    {!isDropdown && (
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleApply}
                            aria-label="Apply filter"
                        >
                            Apply
                        </Button>
                    )}
                </Box>
            </Box>
        </Popover>
    );
}

export default ColumnFilter;
