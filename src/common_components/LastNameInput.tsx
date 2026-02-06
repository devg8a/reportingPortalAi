import React from "react";
import TextField from "@mui/material/TextField";

interface LastNameInputProps {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    errors?: string;
    touched?: boolean;
    maxLength?: number;
}

export default function LastNameInput({
    label,
    placeholder,
    value,
    onChange,
    onBlur,
    errors,
    touched,
    maxLength
}: LastNameInputProps) {
    return (
        <>
            <TextField
                className='form-input-root'
                label={label}
                value={value}
                type="text"
                fullWidth
                placeholder={placeholder}
                onChange={onChange}
                onBlur={onBlur}
                InputLabelProps={{ shrink: true }}
                inputProps={{ maxLength }}
            />
            {errors && touched ? <div className='error-label'>
                <p>{errors}</p>
            </div> : null}
        </>
    );
}
