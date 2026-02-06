import React from "react";
import TextField from "@mui/material/TextField";

interface NameInputProps {
    label: string;
    type?: string;
    required?: boolean;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    autoComplete?: string;
    errors?: string;
    touched?: boolean;
    placeholder?: string;
}

function NameInput({
    label,
    type = "text",
    required,
    value,
    onChange,
    onBlur,
    autoComplete,
    errors,
    touched,
    placeholder
}: NameInputProps) {
    return (
        <>
            <TextField
                className='form-input-root'
                label={label}
                placeholder={placeholder}
                value={value}
                type={type}
                fullWidth
                onChange={onChange}
                onBlur={onBlur}
                InputLabelProps={{ shrink: true }}
                autoComplete={autoComplete}
                required={required}
            />
            {errors && touched ? <div className='error-label'>
                <p>{errors}</p>
            </div> : null}
        </>
    );
}

export default React.memo(NameInput);
