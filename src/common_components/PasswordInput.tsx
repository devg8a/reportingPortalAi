import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

interface PasswordInputProps {
    label: string;
    Placeholder?: string;
    value: string;
    errors?: string;
    touched?: boolean;
    name: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    type?: string;
}

export default function PasswordInput({
    label,
    Placeholder,
    value,
    errors,
    touched,
    name,
    onChange,
    onBlur,
    type
}: PasswordInputProps): React.ReactElement {
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const handleClickShowPassword = (): void => {
        setShowPassword((prev) => !prev);
    };

    const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
    };

    return (
        <>
            <TextField
                name={name}
                value={value}
                fullWidth
                type={showPassword ? "text" : "password"}
                label={label}
                placeholder={Placeholder}
                autoComplete="current-password"
                className="form-input-root"
                onChange={onChange}
                onBlur={onBlur}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                                className="password-toggle-button"
                            >
                                {showPassword ? (
                                    <VisibilityOffIcon fontSize="small" />
                                ) : (
                                    <VisibilityIcon fontSize="small" />
                                )}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            {errors && touched ? <div className='error-label'>
                <p>{errors && touched ? errors : null}</p>
            </div> : null}
        </>
    );
}
