import React, { useMemo, useEffect, useRef, useState } from "react";
import {
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Box,
    OutlinedInput,
    Checkbox,
    Divider,
    SelectChangeEvent,
    SvgIcon
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const SELECT_ALL_VALUE = "__SELECT_ALL__";

export interface Option {
    value: string;
    label: string;
    chipColor?: string;
    textColor?: string;
}

interface MultiSelectInputProps {
    label: string;
    value?: string[];
    onChange: (event: { target: { name: string; value: string[] } }) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    errors?: string;
    touched?: boolean;
    options?: Option[];
    placeholder?: string;
    name: string;
    required?: boolean;
    maxDisplay?: number;
    disabled?: boolean;
}

export default function MultiSelectInput({
    label,
    value = [],
    onChange,
    onBlur,
    errors,
    touched,
    options = [],
    placeholder = "Select...",
    name,
    required = false,
    maxDisplay = 3,
    disabled = false,
}: MultiSelectInputProps) {
    const [open, setOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // Ensure value is always an array
    const currentValue = useMemo(() => {
        if (!value) return [];
        return Array.isArray(value) ? value : [];
    }, [value]);

    // Reset showAll when value changes and items are less than maxDisplay
    useEffect(() => {
        if (currentValue.length <= maxDisplay) {
            setShowAll(false);
        }
    }, [currentValue.length, maxDisplay]);

    // Handle click outside to reset showAll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showAll && selectRef.current) {
                const isClickInside = selectRef.current.contains(event.target as Node);

                // Reset showAll if clicking outside
                if (!isClickInside) {
                    setShowAll(false);
                }
            }
        };

        if (showAll) {
            // Use mousedown to catch clicks before they might trigger other events
            document.addEventListener("mousedown", handleClickOutside);

            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [showAll]);

    // Check if all options are selected
    const allSelected = options.length > 0 && currentValue.length === options.length;
    const someSelected = currentValue.length > 0 && currentValue.length < options.length;

    const handleDelete = (valueToDelete: string, event: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const newValue = currentValue.filter((item) => item !== valueToDelete);
        onChange({
            target: {
                name: name,
                value: newValue,
            },
        });
    };

    const handleMoreClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        setShowAll(true);
    };

    const handleBlurEvent = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Reset showAll when field loses focus
        setTimeout(() => {
            setShowAll(false);
        }, 100);
        if (onBlur) {
            onBlur(event);
        }
    };

    const displayCount = currentValue.length;
    const remainingCount = displayCount > maxDisplay ? displayCount - maxDisplay : 0;

    // Determine how many items to display
    const itemsToDisplay = showAll
        ? currentValue.length
        : Math.min(maxDisplay, currentValue.length);

    const handleChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value: selectedValue },
        } = event;

        // Filter out the SELECT_ALL special value
        let filteredValue = typeof selectedValue === "string"
            ? selectedValue.split(",").filter((v) => v && v !== SELECT_ALL_VALUE)
            : Array.isArray(selectedValue)
                ? selectedValue.filter((v) => v && v !== SELECT_ALL_VALUE)
                : [];

        // Check if SELECT_ALL was in the selection
        const hasSelectAll = typeof selectedValue === "string"
            ? selectedValue.includes(SELECT_ALL_VALUE)
            : Array.isArray(selectedValue) && selectedValue.includes(SELECT_ALL_VALUE);

        if (hasSelectAll) {
            // Toggle all selection
            if (allSelected) {
                filteredValue = [];
            } else {
                filteredValue = options.map((opt) => opt.value);
            }
        }

        onChange({
            target: {
                name: name,
                value: filteredValue,
            },
        });
    };
    const UncheckedIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24" style={{ fill: "#D5D7DA" }}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="#D5D7DA" strokeWidth="2" />
    </SvgIcon>
    );

    const CheckedIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24" style={{ fill: "#FF008E" }}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="transparent" stroke="#FF008E" />
        <path d="M6 12l4 4 8-8" fill="none" stroke="#FF008E" strokeWidth="2" />
    </SvgIcon>
    );

    const IndeterminateIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24" style={{ fill: "#FF008E" }}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="transparent" stroke="#FF008E" />
        <rect x="6" y="11" width="12" height="1" fill="none" stroke="#FF008E" strokeWidth="1"  />
    </SvgIcon>
    );

    const getAvatarBgColor = (index: number): string => {
        const colors = [
          'multicolor-tag-one',
          'multicolor-tag-two',
          'multicolor-tag-three',
        ];
        return colors[index % colors.length];
      };

    return (
        <Box ref={selectRef} sx={{ position: "relative" }}>
            <FormControl fullWidth error={Boolean(errors && touched)} className="multicolor-tag-select">
                <InputLabel shrink>
                    {label}
                    {required && <span style={{ color: "#f04438" }}>*</span>}
                </InputLabel>
                <Select<string[]>
                    name={name}
                    multiple
                    value={currentValue}
                    onChange={handleChange}
                    onBlur={handleBlurEvent}
                    onOpen={() => setOpen(true)}
                    onClose={() => {
                        setOpen(false);
                        // Reset showAll when dropdown closes
                        setShowAll(false);
                    }}
                    open={open}
                    displayEmpty
                    disabled={disabled}
                    input={<OutlinedInput label={label} />}
                    renderValue={() => (
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                                minHeight: "24px",
                                maxHeight: showAll ? "120px" : "auto",
                                overflowY: showAll && currentValue.length > 6 ? "auto" : "visible",
                                overflowX: "hidden",
                                "&::-webkit-scrollbar": {
                                    width: "6px",
                                },
                                "&::-webkit-scrollbar-track": {
                                    backgroundColor: "#f5f5f5",
                                    borderRadius: "3px",
                                },
                                "&::-webkit-scrollbar-thumb": {
                                    backgroundColor: "#d5d7da",
                                    borderRadius: "3px",
                                    "&:hover": {
                                        backgroundColor: "#b5b7ba",
                                    },
                                },
                            }}
                            onMouseDown={(e: React.MouseEvent) => {
                                // Only prevent if clicking on chips, not on empty space
                                if (
                                    (e.target as HTMLElement).closest(".MuiChip-root") ||
                                    (e.target as HTMLElement).closest(".MuiChip-deleteIcon")
                                ) {
                                    e.stopPropagation();
                                }
                            }}
                        >
                            {currentValue.slice(0, itemsToDisplay).map((val, userIndex) => {
                                const option = options.find((opt) => opt.value === val);
                                const optionLabel = option ? option.label : val;
                                const chipColor = option?.chipColor || "#f5f5f5";
                                const textColor = option?.textColor || "#414651";

                                return (
                                    <Chip
                                        className={`${getAvatarBgColor(userIndex)}`}
                                        key={val}
                                        label={optionLabel}
                                        onDelete={(e) => {
                                            handleDelete(val, e);
                                        }}
                                        deleteIcon={<CloseIcon style={{ fontSize: "12px" }} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                        onMouseDown={(e) => {
                                            // Prevent select from opening when clicking on chip
                                            e.stopPropagation();
                                        }}
                                        sx={{
                                            backgroundColor: chipColor,
                                            color: textColor,
                                            fontSize: "14px",
                                            fontWeight: 500,
                                            height: "24px",
                                            borderRadius: "16px",
                                            cursor: "default",
                                            flexShrink: 0,
                                            "& .MuiChip-deleteIcon": {
                                                color: textColor,
                                                fontSize: "12px",
                                                cursor: "pointer",
                                                "&:hover": {
                                                    color: textColor,
                                                },
                                            },
                                            "&:hover": {
                                                backgroundColor: chipColor,
                                            },
                                        }}
                                    />
                                );
                            })}
                            {!showAll && remainingCount > 0 && (
                                <Chip
                                    className="multicolor-more"
                                    label={`+${remainingCount}`}
                                    onClick={handleMoreClick}
                                    sx={{
                                        backgroundColor: "#f5f5f5",
                                        color: "#414651",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        height: "24px",
                                        borderRadius: "16px",
                                        cursor: "pointer",
                                        flexShrink: 0,
                                        "&:hover": {
                                            backgroundColor: "#e5e5e5",
                                        },
                                    }}
                                />
                            )}
                        </Box>
                    )}
                    className="form-input-root"
                    sx={{
                        "& .MuiSelect-select": {
                            padding: "10px 14px",
                            minHeight: "24px",
                        },
                    }}
                    MenuProps={{
                        disablePortal: true,
                        PaperProps: {
                            sx: {
                                boxShadow: "0px 12px 16px -4px rgba(10, 13, 18, 0.08), 0px 4px 6px -2px rgba(10, 13, 18, 0.03)",
                                borderRadius: "8px",
                                border: "1px solid #f5f5f5",
                                mt: 1,
                            },
                        },
                    }}
                >
                    <MenuItem
                        value={SELECT_ALL_VALUE}
                        className="employee-portfolio-checkbox-list"
                        sx={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            "&:hover": { backgroundColor: "transparent" },
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                            <Checkbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                icon={<UncheckedIcon />}
                                checkedIcon={<CheckedIcon />}
                                indeterminateIcon={<IndeterminateIcon />}
                                sx={{
                                    padding: 0,
                                    color: "#d5d7da",
                                    "&.Mui-checked": { color: "#ff008e" },
                                    "&.MuiCheckbox-indeterminate": { color: "#ff008e" },
                                    "& .MuiSvgIcon-root": { fontSize: "16px" },
                                }}
                            />
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "#414651" }}>
                                {allSelected ? "Unselect All" : "Select All"} {label}
                            </span>
                        </Box>
                    </MenuItem>

                    <Divider sx={{ backgroundColor: "#f5f5f5", margin: 0 }} />
                    {options.map((option) => {
                        const isSelected = currentValue.includes(option.value);
                        return (
                            <MenuItem
                                key={option.value}
                                value={option.value}
                                sx={{
                                    padding: "10px 16px",
                                    "&:hover": {
                                        backgroundColor: "transparent",
                                    },
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                                    <Checkbox
                                        checked={isSelected}
                                        icon={<UncheckedIcon />}
                                        checkedIcon={<CheckedIcon />}
                                        indeterminateIcon={<IndeterminateIcon />}
                                        sx={{
                                            padding: 0,
                                            color: "#d5d7da",
                                            "&.Mui-checked": {
                                                color: "#ff008e",
                                            },
                                            "& .MuiSvgIcon-root": {
                                                fontSize: "16px",
                                                width: "16px",
                                                height: "16px",
                                            },
                                            "&:hover": {
                                                backgroundColor: "transparent",
                                            },
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: "14px",
                                            fontWeight: 500,
                                            lineHeight: "20px",
                                            color: "#414651",
                                        }}
                                    >
                                        {option.label}
                                    </Box>
                                </Box>
                            </MenuItem>
                        );
                    })}
                </Select>
                {errors && touched && (
                    <div className="error-label">
                        <p>{errors}</p>
                    </div>
                )}
            </FormControl>
        </Box>
    );
}
