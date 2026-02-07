import React from "react";
import { Box, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface CampaignMetricCardProps {
    title: string;
    value: number;
    previousValue?: number;
    showComparison?: boolean;
    formatType?: "percent" | "number" | "currency";
}

const formatValue = (val: number, type: string): string => {
    switch (type) {
        case "percent":
            return `${val.toFixed(2)}`;
        case "currency":
            return `$${Math.abs(val).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        case "number":
        default:
            return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
};

const CampaignMetricCard: React.FC<CampaignMetricCardProps> = ({
    title,
    value,
    previousValue = 0,
    showComparison = true,
    formatType = "number",
}) => {
    const diff = value - previousValue;
    let percent = 0;
    if (previousValue === 0 && value !== 0) {
        percent = 100;
    } else if (previousValue !== 0) {
        percent = (diff / Math.abs(previousValue)) * 100;
    }

    const isDecrease = diff < 0;
    const green = "#059669";
    const red = "#DC2626";
    const greenBg = "#D1FAE5";
    const redBg = "#FEE2E2";
    const color = isDecrease ? red : green;
    const bgColor = isDecrease ? redBg : greenBg;

    const suffix = formatType === "percent" ? " %" : "";

    return (
        <Box
            sx={{
                border: "1px solid #E5E7EB",
                borderRadius: "clamp(6px, 0.5vw, 10px)",
                padding: "clamp(12px, 1vw, 20px)",
                backgroundColor: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                gap: "clamp(4px, 0.3vw, 8px)",
                flex: 1,
                minWidth: 0,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography
                    sx={{
                        fontSize: "clamp(11px, 0.8vw, 14px)",
                        fontWeight: 500,
                        color: "#6B7280",
                        lineHeight: 1.4,
                    }}
                >
                    {title}
                </Typography>
                <InfoOutlinedIcon
                    sx={{
                        fontSize: "clamp(12px, 0.9vw, 16px)",
                        color: "#9CA3AF",
                    }}
                />
            </Box>

            <Typography
                sx={{
                    fontSize: "clamp(18px, 1.4vw, 24px)",
                    fontWeight: 600,
                    color: "#111827",
                    lineHeight: 1.2,
                }}
            >
                {formatValue(value, formatType)}
                {suffix && (
                    <Box
                        component="span"
                        sx={{
                            fontSize: "clamp(12px, 0.9vw, 16px)",
                            fontWeight: 400,
                            color: "#9CA3AF",
                            ml: 0.25,
                        }}
                    >
                        {suffix}
                    </Box>
                )}
            </Typography>

            {showComparison && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "clamp(11px, 0.8vw, 14px)",
                            fontWeight: 400,
                            color: "#9CA3AF",
                        }}
                    >
                        {formatValue(previousValue, formatType)}
                        {suffix}
                    </Typography>
                    {percent !== 0 && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.25,
                                px: "clamp(6px, 0.5vw, 10px)",
                                py: "clamp(1px, 0.15vw, 3px)",
                                borderRadius: "999px",
                                backgroundColor: bgColor,
                                color,
                                fontSize: "clamp(10px, 0.75vw, 13px)",
                                fontWeight: 600,
                            }}
                        >
                            {Math.abs(percent).toFixed(0)}%
                            {isDecrease ? (
                                <TrendingDownIcon
                                    sx={{
                                        fontSize: "clamp(12px, 0.9vw, 16px)",
                                    }}
                                />
                            ) : (
                                <TrendingUpIcon
                                    sx={{
                                        fontSize: "clamp(12px, 0.9vw, 16px)",
                                    }}
                                />
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default CampaignMetricCard;
