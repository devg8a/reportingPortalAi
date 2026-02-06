import { Box, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { formatStat } from "../../../helper/statsFormatter";
import { StyledCurrency } from "../../../helper/StyledCurrency";

interface StatCardProps {
    title: string;
    value: number | string | null | undefined;
    previous: number | string | null | undefined;
    isInverse?: boolean; // true = Spend, CPC
    comparisonActive?: boolean;
    formatType?: string;
}

const StatCard = ({
    title,
    value,
    previous,
    isInverse = false,
    comparisonActive = false,
    formatType,
}: StatCardProps) => {
    /* ---------- NORMALIZED VALUES ---------- */
    const safeValue = value ?? 0;
    const safePrevious = previous ?? 0;

    // Show comparison section ONLY if comparisonActive is true
    const hasPrevious = comparisonActive;

    const valNum = Number(safeValue);
    const prevNum = Number(safePrevious);

    // Calculate difference and percent
    const diff = valNum - prevNum;
    let percent: number;

    if (prevNum === 0 && valNum === 0) {
        percent = 0;
    } else if (prevNum === 0 && valNum !== 0) {
        percent = 100;
    } else {
        percent = (diff / prevNum) * 100;
    }


    const isDecrease = diff < 0;

    /* ---------- COLORS (FINAL LOGIC) ---------- */
    const green = "#16a34a";
    const greenBg = "#dcfce7";
    const red = "#dc2626";
    const redBg = "#fee2e2";

    // User requested Up=Green regardless of metric type (standardizing visual consistency)
    const color = isDecrease ? red : green;
    const bgColor = isDecrease ? redBg : greenBg;

    const fieldForFormatting = formatType || title;

    const getIconByTitle = (title: string) => {
        const t = title.toLowerCase();

        if (t.includes("roas")) return "/assets/stats/roas.svg";
        if (t.includes("spend")) return "/assets/stats/spend.svg";
        if (t.includes("revenue")) return "/assets/stats/revenue.svg";
        if (t.includes("cpc")) return "/assets/stats/cpc.svg";
        if (t.includes("session")) return "/assets/stats/cpc.svg";
        if (t.includes("sale")) return "/assets/stats/sale.svg";
        if (t.includes("clicks")) return "/assets/stats/cpc.svg";

        return "/assets/stats/revenue.svg"; // safe fallback
    };

    const icon = getIconByTitle(title);

    const showBadge =
        comparisonActive &&
        percent !== null;


    return (
        <Box
            sx={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px 16px",
                backgroundColor: "#ffffff",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                transition: "all 0.25s ease",

            }}
        >
            {/* ---------- HEADER ---------- */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box component="img" src={icon} alt={title} sx={{ width: 20, height: 20 }} />
                <Typography
                    sx={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#52525b",
                    }}
                >
                    {title}
                </Typography>
            </Box>

            {/* ---------- MAIN VALUE ---------- */}
            <div className="stat-value" style={{ fontSize: "24px !important" }}>
                <StyledCurrency value={formatStat(safeValue, fieldForFormatting)} />
            </div>

            {hasPrevious && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        pt: 1,
                        borderTop: "1px solid #f1f5f9",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#64748b",
                        }}
                        className="prevdata"
                    >
                        <StyledCurrency symbolWeight={400} valueWeight={400} symbolColor="#64748b" valueColor="#64748b" value={formatStat(safePrevious, fieldForFormatting)} />
                    </Typography>

                    {showBadge && (
                        <Box
                            sx={{
                                px: 1.5,
                                py: 0.75,
                                borderRadius: "999px",
                                backgroundColor: bgColor,
                                color,
                                fontSize: 13,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                            }}
                        >
                            {Math.abs(percent!).toFixed(1)}%
                            {isDecrease ? (
                                <TrendingDownIcon className="iconDown" sx={{ fontSize: 16, color: "#dc2626" }} />
                            ) : (
                                <TrendingUpIcon className="iconUp" sx={{ fontSize: 16, color: "#16a34a" }} />
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default StatCard;
