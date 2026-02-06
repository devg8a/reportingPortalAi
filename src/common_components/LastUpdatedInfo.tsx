import React, { useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import moment, { Moment } from "moment";

interface Props {
    updatedAt: string | null | undefined;
    onRefresh?: () => void;
}

const LastUpdatedInfo: React.FC<Props> = ({ updatedAt, onRefresh }) => {
    const [spin, setSpin] = useState(false);

    // Safely parse date
    const date = useMemo<Moment | null>(() => {
        if (!updatedAt) return null;

        const m = moment(updatedAt); // ya moment.utc(updatedAt) agar backend UTC bhej raha hai
        return m.isValid() ? m : null;
    }, [updatedAt]);

    const datePart = date ? date.format("MMM DD, YYYY") : "--";
    const timePart = date ? date.format("hh:mm A") : "--";
    const ago = date ? date.fromNow(true) : "";

    const handleClick = () => {
        if (spin) return;

        setSpin(true);
        setTimeout(() => setSpin(false), 900);

        onRefresh?.();
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2,
                py: 1.5,
                bgcolor: "#ffffff",
                borderRadius: "16px",
            }}
        >
            {/* Refresh Icon */}
            {/* <Box
                onClick={handleClick}
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    bgcolor: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                }}
            >
                <img
                    src="/assets/refresh.svg"
                    alt="refresh"
                    style={{
                        width: 22,
                        height: 22,
                        opacity: 0.7,
                        transition: "transform 0.9s ease",
                        // transform: spin ? "rotate(360deg)" : "none",
                    }}
                />
            </Box> */}

            <Box className="all-Font-Sizes">
                <Typography
                    sx={{
                        // fontSize: "14px",
                        fontWeight: 500,
                        color: "#6b7280",
                        lineHeight: 1.2,
                    }}
                >
                    Last updated
                </Typography>

                {date ? (
                    <Typography
                        sx={{
                            // fontSize: "14px",
                            lineHeight: 1.3,
                            color: "#111827",
                        }}
                    >
                        <Box component="span" sx={{ fontWeight: 500 }}>
                            {datePart}
                        </Box>

                        <Box
                            component="span"
                            sx={{ mx: 0.5, fontWeight: 400, color: "#6b7280" }}
                        >
                            at
                        </Box>

                        <Box component="span" sx={{ fontWeight: 500 }}>
                            {timePart}
                        </Box>

                        <Box
                            component="span"
                            sx={{ ml: 1, fontWeight: 500, color: "#6b7280" }}
                        >
                            ({ago} ago)
                        </Box>
                    </Typography>
                ) : (
                    <Typography
                        sx={{
                            // fontSize: "14px",
                            lineHeight: 1.3,
                            color: "#9ca3af",
                        }}
                    >
                        Not updated yet
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default LastUpdatedInfo;