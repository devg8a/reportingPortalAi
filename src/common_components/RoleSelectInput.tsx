import React from "react";
import { Select, MenuItem, FormControl, InputLabel, Box, Button, SelectChangeEvent } from "@mui/material";
import CallSplitIcon from "@mui/icons-material/CallSplit";

interface RoleSelectInputProps {
    label: string;
    value?: string;
    onChange: (event: SelectChangeEvent<string>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    errors?: string;
    touched?: boolean;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    name: string;
    required?: boolean;
    onOverrideClick?: () => void;
    overRideShowStatus: boolean;
    hasOverrides?: boolean; // Show icon when user has overrides
}

export default function RoleSelectInput({
    label,
    value,
    onChange,
    onBlur,
    errors,
    touched,
    options = [],
    placeholder = "Select...",
    name,
    required = false,
    onOverrideClick,
    overRideShowStatus = false,
    hasOverrides = false
}: RoleSelectInputProps) {
    const selectedOption = options.find((opt) => opt.value === value);
    const isRoleSelected = value && value !== "";

    return (
        <Box>
            <FormControl fullWidth error={Boolean(errors && touched)} className="tag-fixed-color">
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0 }}>
                    <InputLabel shrink sx={{ mb: 0 }}>
                        {label}
                        {required && <span style={{ color: "#f04438" }}>*</span>}
                    </InputLabel>
                    {onOverrideClick && overRideShowStatus && (
                        <Button
                            onClick={onOverrideClick}
                            disabled={!isRoleSelected}
                            sx={{
                                textTransform: "none",
                                fontSize: "13px",
                                fontWeight: 500,
                                color: isRoleSelected ? "#414651" : "#414651",
                                padding: "0",
                                minWidth: "auto",
                                cursor: isRoleSelected ? "pointer" : "not-allowed",
                                "&:hover": {
                                    backgroundColor: "transparent",
                                    textDecoration: isRoleSelected ? "underline" : "none",
                                },
                                "&.Mui-disabled": {
                                    color: "#d5d7da",
                                },
                            }}
                        >
                            + Override Role
                        </Button>
                    )}
                </Box>
                <Select
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    displayEmpty
                    className="form-input-root all-single-select-input"
                    renderValue={(selected) => {
                        if (!selected || !selectedOption) {
                            return <em style={{ color: "#999" }}>{placeholder}</em>;
                        }
                        return (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    backgroundColor: "#eff8ff",
                                    color: "#175cd3",
                                    borderRadius: "16px",
                                    padding: "2px 8px 2px 10px",
                                    height: "19px",
                                    gap: "4px",
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        lineHeight: "20px",
                                        color: "#175cd3",
                                        textTransform:"capitalize"
                                    }}
                                >
                                    {selectedOption.label}
                                </Box>
                                {/* Show icon only when hasOverrides is true */}
                                {hasOverrides && (
                                    <div className="d-flex">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5v6m0 0A1.5 1.5 0 1 0 4.5 9M3 7.5A1.5 1.5 0 0 1 4.5 9M9 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m0 0A4.5 4.5 0 0 1 4.5 9" stroke="#2e90fa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                   </div>
                                )}
                            </Box>
                        );
                    }}
                    sx={{
                        "& .MuiSelect-select": {
                            padding: "10px 14px",
                        },
                    }}
                >
                    <MenuItem value="" disabled>
                        <em>{placeholder}</em>
                    </MenuItem>
                    {options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {errors && touched && (
                <div className="error-label">
                    <p>{errors}</p>
                </div>
            )}
        </Box>
    );
}
