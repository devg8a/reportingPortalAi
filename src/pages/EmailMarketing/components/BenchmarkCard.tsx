import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { BenchmarkPeriod } from "../../../types/emailMarketing.types";

interface BenchmarkCardProps {
    period: BenchmarkPeriod;
    label: string;
    color: string;
    bgColor: string;
}

const BenchmarkMetric: React.FC<{
    label: string;
    value: number;
    changePercent?: number;
    suffix?: string;
}> = ({ label, value, changePercent, suffix = "%" }) => {
    const isDecrease = (changePercent ?? 0) < 0;
    const green = "#059669";
    const red = "#DC2626";
    const greenBg = "#D1FAE5";
    const redBg = "#FEE2E2";
    const color = isDecrease ? red : green;
    const bgColor = isDecrease ? redBg : greenBg;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(4px, 0.3vw, 8px)",
                flex: 1,
                minWidth: 0,
                padding: "clamp(8px, 0.6vw, 12px)",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography
                    sx={{
                        fontSize: "clamp(11px, 0.8vw, 13px)",
                        fontWeight: 500,
                        color: "#6B7280",
                        lineHeight: 1.4,
                    }}
                >
                    {label}
                </Typography>
            </Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "clamp(4px, 0.3vw, 8px)",
                }}
            >
                <Typography
                    sx={{
                        fontSize: "clamp(18px, 1.4vw, 24px)",
                        fontWeight: 600,
                        color: "#111827",
                        lineHeight: 1.2,
                    }}
                >
                    {value.toFixed(2)}
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
                </Typography>
                {changePercent !== undefined && changePercent !== 0 && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.25,
                            px: "clamp(4px, 0.4vw, 8px)",
                            py: "clamp(1px, 0.1vw, 2px)",
                            borderRadius: "999px",
                            backgroundColor: bgColor,
                            color,
                            fontSize: "clamp(9px, 0.7vw, 12px)",
                            fontWeight: 600,
                        }}
                    >
                        {Math.abs(changePercent).toFixed(2)}%
                        {isDecrease ? (
                            <TrendingDownIcon
                                sx={{ fontSize: "clamp(10px, 0.8vw, 14px)" }}
                            />
                        ) : (
                            <TrendingUpIcon
                                sx={{ fontSize: "clamp(10px, 0.8vw, 14px)" }}
                            />
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

const BenchmarkCard: React.FC<BenchmarkCardProps> = ({
    period,
    label,
    color,
    bgColor,
}) => {
    return (
        <Box
            sx={{
                border: "1px solid #E5E7EB",
                borderRadius: "clamp(6px, 0.5vw, 10px)",
                backgroundColor: "#FFFFFF",
                overflow: "hidden",
                flex: 1,
                minWidth: 0,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: bgColor,
                    padding: "clamp(8px, 0.6vw, 12px) clamp(12px, 0.8vw, 16px)",
                    borderBottom: `1px solid ${color}20`,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                        sx={{
                            width: "clamp(20px, 1.4vw, 28px)",
                            height: "clamp(20px, 1.4vw, 28px)",
                            borderRadius: "50%",
                            backgroundColor: color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: "clamp(10px, 0.7vw, 12px)",
                                fontWeight: 700,
                                color: "#FFFFFF",
                            }}
                        >
                            B
                        </Typography>
                    </Box>
                    <Typography
                        sx={{
                            fontSize: "clamp(12px, 0.9vw, 15px)",
                            fontWeight: 600,
                            color: "#111827",
                        }}
                    >
                        Benchmark
                    </Typography>
                </Box>
                <Chip
                    label={label}
                    size="small"
                    sx={{
                        backgroundColor: color,
                        color: "#FFFFFF",
                        fontWeight: 600,
                        fontSize: "clamp(10px, 0.7vw, 12px)",
                        height: "clamp(20px, 1.5vw, 26px)",
                    }}
                />
            </Box>
            <Box
                sx={{
                    display: "flex",
                    gap: 0,
                }}
            >
                <BenchmarkMetric
                    label="Open Rate"
                    value={period.open_rate}
                />
                <Box
                    sx={{
                        width: "1px",
                        backgroundColor: "#E5E7EB",
                        alignSelf: "stretch",
                    }}
                />
                <BenchmarkMetric
                    label="Click Rate"
                    value={period.click_rate}
                />
            </Box>
        </Box>
    );
};

export default BenchmarkCard;
