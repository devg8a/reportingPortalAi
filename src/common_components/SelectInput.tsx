import React, { useState, useMemo } from "react";
import {
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent,
    TextField,
    Box,
    ListSubheader
} from "@mui/material";

interface Option {
    label: string;
    value: string | number;
}

interface SelectInputProps {
    label: string;
    value: string | number;
    onChange: (e: SelectChangeEvent<any>) => void;
    onBlur?: (e: React.FocusEvent<any>) => void;
    errors?: string;
    touched?: boolean;
    options?: Option[];
    placeholder?: string;
    name?: string;
    required?: boolean;
    enableSearch?: boolean;
    searchPlaceholder?: string;
    className?: string;
}

export default function SelectInput({
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
    enableSearch = false,
    searchPlaceholder = "Search...",
    className = "form-input-root"
}: SelectInputProps) {
    const [searchText, setSearchText] = useState("");

    const filteredOptions = useMemo(() => {
        if (!searchText) return options;
        return options.filter((option) =>
            option.label.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [options, searchText]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };

    return (
        <Box>
            <FormControl fullWidth error={!!(errors && touched)}>
                <InputLabel shrink>
                    {label}
                    {required && <span style={{ color: '#f04438' }}>*</span>}
                </InputLabel>
                <Select
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    onBlur={onBlur}
                    displayEmpty
                    className={className}

                    MenuProps={{
                        autoFocus: false,
                        PaperProps: {
                            style: { maxWidth: 200, maxHeight: 300 }
                        }
                    }}
                    onClose={() => setSearchText("")}
                    sx={{
                        '& .MuiSelect-select': {
                            padding: '10px 14px',
                        },
                        // border: "2px solid #e5e7eb",
                    }}
                >
                    <MenuItem value="" disabled>
                        <em>{placeholder}</em>
                    </MenuItem>

                    {enableSearch && (
                        <ListSubheader>
                            <TextField
                                size="small"
                                autoFocus
                                placeholder={searchPlaceholder}
                                fullWidth
                                value={searchText}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => {
                                    if (e.key !== "Escape") {
                                        e.stopPropagation();
                                    }
                                }}
                                sx={{ mb: 1 }}
                            />
                        </ListSubheader>
                    )}

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem disabled>
                            <em>No options found</em>
                        </MenuItem>
                    )}
                </Select>
            </FormControl>
            {errors && touched && (
                <div className='error-label'>
                    <p>{errors}</p>
                </div>
            )}
        </Box>
    );
}