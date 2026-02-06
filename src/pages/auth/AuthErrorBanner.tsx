import React from "react";
import { Box, Typography } from "@mui/material";

interface MessageObject {
    title?: string;
    description?: string;
}

interface AuthErrorBannerProps {
    message: string | MessageObject;
    title?: string;
    description?: string;
    flag?: boolean | MessageObject;
}

/**
 * Auth inline error banner (Figma: node 1480:20470)
 * Props:
 * - message: string | { title?: string; description?: string }
 * - title: optional string (overrides message.title)
 * - description: optional string (overrides message.description)
 */
export default function AuthErrorBanner({ message, title, description, flag }: AuthErrorBannerProps): React.ReactElement | null {

    const derived =
        typeof message === "object" && message
            ? {
                title: message.title ?? "",
                description: message.description ?? "",
            }
            : { title: String(message || ""), description: "" };

    const finalTitle = (title ?? derived.title ?? "").trim();
    const finalDescription = (description ?? derived.description ?? "").trim();

    if (!finalTitle && !finalDescription) return null;

    return (
        <Box
            sx={{
                width: "100%",
                backgroundColor: "#fee7ef", // danger-50
                borderRadius: "8px", // unit-xs
                padding: "12px", // unit-sm
                display: "flex",
                alignItems: "center",
                gap: "16px", // unit-md
            }}
        >
            <Box
                component="img"
                alt=""
                src={flag ? "/assets/toastIcons/right-tick.svg" : "/assets/toastIcons/cross-icon.svg"}
                sx={{ width: 24, height: 24, flex: "0 0 24px" }}
            />

            <Box sx={{ flex: 1, minWidth: 0 }}>
                {finalTitle && (
                    <Typography
                        sx={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 500,
                            fontSize: "14px",
                            lineHeight: "20px",
                            color: "#b42318", // Error/700
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {finalTitle}
                    </Typography>
                )}
                {finalDescription && (
                    <Typography
                        sx={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 400,
                            fontSize: "14px",
                            lineHeight: "20px",
                            color: "#52525b", // default-600
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {finalDescription}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
