import React from "react";
import { Box, Typography } from "@mui/material";

interface Props {
    title?: string;                     // optional now
    rightSection?: React.ReactNode;
    lastUpdatedSection?: React.ReactNode; // pass LastUpdatedInfo component
}

const PagesCommonHeader: React.FC<Props> = ({
    title,
    rightSection,
    lastUpdatedSection
}) => {

    const showLeft = Boolean(lastUpdatedSection || title);

    return (
        <Box
            sx={{
                width: "100%",
                bgcolor: "#fff",
                borderRadius: "10px",
                border: "2px solid #E5E7Eb",
                px: 2.5,
                py: 2,

                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
            className="pages-common-header-left"
        >
            {/* LEFT SIDE: Auto Switch */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} >
                {lastUpdatedSection ? (
                    lastUpdatedSection
                ) : (
                    title && (
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, fontSize: "20px", color: "#000" }}
                        >
                            {title}
                        </Typography>
                    )
                )}
            </Box>

            {/* RIGHT SIDE */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                {rightSection}
            </Box>
        </Box>
    );
};

export default PagesCommonHeader;
