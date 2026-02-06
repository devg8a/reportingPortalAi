import React, { ReactNode } from "react";
import Box from "@mui/material/Box";

interface PageContainerProps {
    children: ReactNode;
}

/**
 * Reusable content container for page bodies.
 * Keeps spacing consistent across dashboard pages.
 */
export default function PageContainer({ children }: PageContainerProps): React.ReactElement {
    return (
        <Box
            component="main"
            sx={{
                p: 3,
                width: "100%",
                minHeight: "100%",
            }}
        >
            {children}
        </Box>
    );
}
