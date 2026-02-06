import { Box, SxProps, Theme } from "@mui/material";

export type DateRange =
    | "today"
    | "yesterday"
    | "last7days"
    | "last30days"
    | "day"
    | "week"
    | "month"
    | "custom";

interface DateRangeTabsProps {
    selectedRange: DateRange;
    onChange: (range: DateRange) => void;
    mode?: "account" | "performance"; // 👈 NEW
    sx?: SxProps<Theme>;
}


const DateRangeTabs = ({
    selectedRange,
    onChange,
    mode = "account",
    sx,
}: DateRangeTabsProps) => {
    console.log(selectedRange, "aaa")
    const tabs =
        mode === "performance"
            ? [
                { label: "Day", value: "day" },
                { label: "Week", value: "week" },
                { label: "Month", value: "month" },
            ]
            : [
                { label: "Today", value: "today" },
                { label: "Yesterday", value: "yesterday" },
                { label: "Last 7 days", value: "last7days" },
                { label: "Last 30 days", value: "last30days" },
            ];

    return (
        <Box sx={{
            display: "flex",
            border: "2px solid #ddd",
            borderRadius: "8px",
            width: "fit-content",
            overflow: "hidden",
            backgroundColor: "#FAFAFA",

            ...sx,
        }} >
            {tabs.map(tab => {
                const isActive = selectedRange === tab.value;
                return (
                    <button
                        className="all-Font-Sizes"
                        key={tab.value}
                        onClick={() => onChange(tab.value as DateRange)}
                        style={{
                            padding: "8px 22px",
                            background: isActive ? "#fff" : "#FAFAFA",
                            border: isActive ? "2px solid #ddd" : "none",
                            color: isActive ? "#000" : "#6b7280",
                            borderRadius: 8,
                            margin: 2,
                            cursor: "pointer",
                            fontWeight: 500,
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </Box>
    );
};

export default DateRangeTabs;
