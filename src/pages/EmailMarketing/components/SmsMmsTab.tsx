import React from "react";
import { Box, Typography } from "@mui/material";
import CampaignMetricCard from "./CampaignMetricCard";

interface SmsMmsTabProps {
    revenue: number;
    previousRevenue: number;
    showComparison: boolean;
    loading: boolean;
}

const SmsMmsTab: React.FC<SmsMmsTabProps> = ({
    revenue,
    previousRevenue,
    showComparison,
}) => {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(12px, 1vw, 20px)",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    gap: "clamp(8px, 0.8vw, 16px)",
                    flexWrap: { xs: "wrap", md: "nowrap" },
                }}
            >
                <Box sx={{ flex: 1, maxWidth: { xs: "100%", md: "25%" } }}>
                    <CampaignMetricCard
                        title="SMS/MMS Revenue"
                        value={revenue}
                        previousValue={previousRevenue}
                        showComparison={showComparison}
                        formatType="currency"
                    />
                </Box>
            </Box>

            <Box
                sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "clamp(6px, 0.5vw, 10px)",
                    backgroundColor: "#FFFFFF",
                    padding: "clamp(24px, 2vw, 48px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "clamp(150px, 15vw, 300px)",
                }}
            >
                <Typography
                    sx={{
                        fontSize: "clamp(14px, 1vw, 18px)",
                        color: "#9CA3AF",
                        fontWeight: 500,
                    }}
                >
                    SMS/MMS campaign details will appear here when data is
                    available
                </Typography>
            </Box>
        </Box>
    );
};

export default SmsMmsTab;
