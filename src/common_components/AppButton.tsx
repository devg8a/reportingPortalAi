import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

interface AppButtonProps extends ButtonProps {
    loading?: boolean;
}

/**
 * Reusable button wrapper to keep defaults consistent.
 * Use MUI props via passthrough.
 */
export default function AppButton({
    children,
    type = "button",
    className,
    variant,
    color,
    loading = false,
    disabled,
    startIcon,
    fullWidth,
    ...props
}: AppButtonProps) {
    return (
        <Button
            type={type}
            variant={variant}
            color={color}
            fullWidth={fullWidth}
            disableElevation
            disabled={disabled || loading}
            className={className}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : startIcon}
            {...props}
        >
            {children}
        </Button>
    );
}
