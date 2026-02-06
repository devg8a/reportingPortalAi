import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface CenteredPageNameProps {
    title: string;
}

/**
 * Minimal placeholder content:
 * Shows the active page name centered (per current scope).
 */
export default function CenteredPageName({ title }: CenteredPageNameProps): React.ReactElement {
    return (
        <Box
            sx={{
                minHeight: "calc(100vh - 120px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 3,
            }}
        >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {title}
            </Typography>
        </Box>
    );
}
