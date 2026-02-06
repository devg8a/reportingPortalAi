import React from "react";
import TextField from "@mui/material/TextField";

interface EmailInputProps {
    label: string;
    placeholder?: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    autoComplete?: string;
    errors?: string;
    touched?: boolean;
    maxLength?: number;
}

export default function EmailInput({
    label,
    placeholder,
    type,
    value,
    onChange,
    onBlur,
    autoComplete,
    errors,
    touched,
    maxLength
}: EmailInputProps): React.ReactElement {

    return (
        <>
            <TextField
                className='form-input-root'
                label={label}
                value={value}
                type={type}
                fullWidth
                placeholder={placeholder}
                onChange={onChange}
                onBlur={onBlur}
                inputProps={{ maxLength }}
                InputLabelProps={{ shrink: true }}
            />
            {errors && touched ? <div className='error-label'>
                <p>{errors && touched ? errors : null}</p>
            </div> : null}
        </>
    );
}
