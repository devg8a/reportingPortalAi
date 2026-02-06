import React, { useCallback, useMemo, useState, ReactNode } from "react";
import { Snackbar, Slide, Box, Typography, SlideProps, IconButton } from "@mui/material";
import { ToastContext, ToastContextType, ToastOptions, ToastSeverity } from "./ToastContext";

const DEFAULT_DURATION_MS = 5000;

// Local icons (public/assets/toastIcons)
const ICONS: Record<string, string> = {
    success: "/assets/toastIcons/right-tick.svg",
    warning: "/assets/toastIcons/warning-icon.svg",
    error: "/assets/toastIcons/cross-icon.svg",
};

interface StyleConfig {
    bg: string;
    text: string;
}

const STYLES: Record<ToastSeverity, StyleConfig> = {
    success: { bg: "#E8FAF0", text: "#17C964" }, // success-50 / success
    warning: { bg: "#FEFCE8", text: "#F5A524" }, // warning-50 / warning
    error: { bg: "#FEE7EF", text: "#B42318" }, // danger-50 / error-700
    info: { bg: "#EEF2FF", text: "#4F46E5" }, // fallback (not in provided Figma)
};

interface Toast {
    id: string;
    message: string;
    severity: ToastSeverity;
    duration: number;
}

function SlideFromRight(props: SlideProps): React.ReactElement {
    // For top-right snackbars, "left" makes it slide in from the right edge.
    return <Slide {...props} direction="left" />;
}

function normalizeSeverity(severity?: string): ToastSeverity {
    const s = (severity || "info").toLowerCase();
    if (s === "success" || s === "error" || s === "warning" || s === "info") return s as ToastSeverity;
    return "info";
}

interface ToastProviderProps {
    children: ReactNode;
}

import { registerToastListener, toast as toastUtils } from "./ToastUtils";
import { CloseOutlined } from "@mui/icons-material";

export default function ToastProvider({ children }: ToastProviderProps): React.ReactElement {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string): void => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, options: ToastOptions = {}): string => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const toast: Toast = {
            id,
            message: message ?? "",
            severity: normalizeSeverity(options.severity),
            duration: typeof options.duration === "number" ? options.duration : DEFAULT_DURATION_MS,
        };
        setToasts((prev) => [toast, ...prev].slice(0, 5)); // keep last 5
        return id;
    }, []);

    // Subscribe to static toast events from ToastUtils
    React.useEffect(() => {
        const cleanup = registerToastListener((message, type) => {
            showToast(message, { severity: type });
        });
        return cleanup;
    }, [showToast]);

    const api: ToastContextType = useMemo(() => {
        return {
            show: showToast,
            success: (msg: string, opts?: ToastOptions) => showToast(msg, { ...(opts || {}), severity: "success" }),
            error: (msg: string, opts?: ToastOptions) => showToast(msg, { ...(opts || {}), severity: "error" }),
            warning: (msg: string, opts?: ToastOptions) => showToast(msg, { ...(opts || {}), severity: "warning" }),
            info: (msg: string, opts?: ToastOptions) => showToast(msg, { ...(opts || {}), severity: "info" }),
            close: removeToast,
        };
    }, [removeToast, showToast]);

    return (
        <ToastContext.Provider value={api}>
            {children}

            {/* Render stack in top-right corner */}
            <Box
                sx={{
                    position: "fixed",
                    top: 16,
                    right: 16,
                    zIndex: (theme) => theme.zIndex.snackbar,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    pointerEvents: "none", // allow clicks through container
                }}
            >
                {toasts.map((t) => (
                    <Snackbar
                        key={t.id}
                        open
                        anchorOrigin={{ vertical: "top", horizontal: "right" }}
                        TransitionComponent={SlideFromRight}
                        autoHideDuration={t.duration}
                        onClose={(_, reason) => {
                            if (reason === "clickaway") return;
                            removeToast(t.id);
                        }}
                        sx={{ position: "static", pointerEvents: "auto" }}
                    >
                        <Box
                            sx={{
                                backgroundColor: (STYLES[t.severity] || STYLES.info).bg,
                                borderRadius: "16px", // Figma unit-md
                                padding: "12px", // Figma unit-sm
                                display: "flex",
                                alignItems: "center",
                                gap: "16px", // Figma unit-md
                                minWidth: 280,
                                maxWidth: 420,
                            }}
                        >

                            <Box
                                component="img"
                                alt=""
                                src={ICONS[t.severity] || ICONS.success}
                                sx={{ width: 24, height: 24, flex: "0 0 24px" }}
                            />
                            <Typography
                                sx={{
                                    fontFamily: "Inter, sans-serif",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    lineHeight: "20px",
                                    color: (STYLES[t.severity] || STYLES.info).text,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                                title={t.message}
                            >
                                {t.message}
                            </Typography>

                            <IconButton
                                size="small"
                                onClick={() => removeToast(t.id)}
                                sx={{
                                    color: "inherit",
                                    padding: 0,
                                    marginLeft: "auto",
                                    flexShrink: 0,
                                }}
                            >
                                <CloseOutlined sx={{ width: 24, height: 24, color: "#797979" }} />
                            </IconButton>
                        </Box>
                    </Snackbar>
                ))}
            </Box>
        </ToastContext.Provider>
    );
}
