import React from "react";
import Typography from "@mui/material/Typography";

interface PageTitleProps {
    children: React.ReactNode;
}

/**
 * Reusable page title component.
 */
export default function PageTitle({ children }: PageTitleProps) {
    return (
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {children}
        </Typography>
    );
}
