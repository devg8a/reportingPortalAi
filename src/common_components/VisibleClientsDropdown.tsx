import React, { useEffect, useRef, useState } from "react";
import {
    Box,
    Menu,
    MenuItem,
    Typography,
    Button,
    TextField,
    InputAdornment,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../redux/store";
import { hideClients, unhideClients, fetchAllAccountSummary } from "../redux/accountSummarySlice";
import CustomLoader from "./CustomLoader";
import IOSSwitch from "./IOSSwitch";



interface Client {
    id: string;
    name: string;
    visible: boolean;
}

interface Props {
    clients: Client[];
    onChange: (updated: Client[]) => void;
    currentDateRange?: { startDate: string; endDate: string };
    label?: string;
    showIcon?: boolean;
    onItemToggle?: (id: string, visible: boolean) => Promise<void>;
    itemName?: string;
    enableUpdateButton?: boolean;
    iconSrc?: string;
    buttonWidth?: number | string;
    primaryColor?: string;
}

const VisibleClientsDropdown: React.FC<Props> = ({
    clients,
    onChange,
    currentDateRange,
    label = "Visible Client",
    showIcon = true,
    onItemToggle,
    itemName = "clients",
    enableUpdateButton = false,
    iconSrc = '/assets/visibleClients.svg',
    buttonWidth = 210,
    primaryColor = "#ec4899",
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [localClients, setLocalClients] = useState<Client[]>(clients);
    const [loadingClientId, setLoadingClientId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");


    const isProcessingRef = useRef(false);
    const pendingUpdatesRef = useRef<string[]>([]);

    useEffect(() => {
        // Only update if not currently processing our own changes
        if (!isProcessingRef.current) {
            setLocalClients(clients);
            setIsDirty(false);
        }
    }, [clients]);

    const open = Boolean(anchorEl);

    useEffect(() => {
        setLocalClients(clients);
        setIsDirty(false);
    }, [clients]);

    // Filter clients based on search query
    const filteredClients = localClients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggle = async (clientId: string, currentVisibility: boolean) => {
        // Prevent toggle if already processing this client or any other
        if (loadingClientId || pendingUpdatesRef.current.includes(clientId)) {
            return;
        }

        // Add to pending updates
        pendingUpdatesRef.current.push(clientId);

        // Optimistic update - immediate UI response
        const updatedClients = localClients.map(c =>
            c.id === clientId ? { ...c, visible: !c.visible } : c
        );

        setLocalClients(updatedClients);

        // If update button enabled, stop here
        if (enableUpdateButton) {
            setIsDirty(true);
            // Remove from pending
            pendingUpdatesRef.current = pendingUpdatesRef.current.filter(id => id !== clientId);
            return;
        }

        // Instant update (old behavior)
        setLoadingClientId(clientId);
        isProcessingRef.current = true;

        try {
            if (onItemToggle) {
                await onItemToggle(clientId, currentVisibility);
            } else {
                if (currentVisibility) {
                    await dispatch(hideClients([clientId])).unwrap();
                } else {
                    await dispatch(unhideClients([clientId])).unwrap();
                }

                if (currentDateRange) {
                    await dispatch(fetchAllAccountSummary({
                        startDate: currentDateRange.startDate,
                        endDate: currentDateRange.endDate,
                    }));
                }
            }

            // Call onChange but mark that we're still processing
            onChange(updatedClients);

            // Small delay to ensure parent has updated
            await new Promise(resolve => setTimeout(resolve, 50));

        } catch (err) {
            console.error("Toggle error:", err);
            // Revert on error
            const revertedClients = localClients.map(c =>
                c.id === clientId ? { ...c, visible: currentVisibility } : c
            );
            setLocalClients(revertedClients);
            onChange(revertedClients);
        } finally {
            setLoadingClientId(null);
            isProcessingRef.current = false;
            // Remove from pending
            pendingUpdatesRef.current = pendingUpdatesRef.current.filter(id => id !== clientId);
        }
    };

    const handleBulkUpdate = async () => {
        setLoadingClientId("bulk");

        try {
            // Get only changed items
            const changedClients = localClients.filter((lc, idx) =>
                lc.visible !== clients[idx]?.visible
            );

            if (onItemToggle) {
                // Call onItemToggle for each changed client
                await Promise.all(
                    changedClients.map(c => {
                        const originalClient = clients.find(oc => oc.id === c.id);
                        return onItemToggle(c.id, originalClient?.visible ?? false);
                    })
                );
            } else {
                // Use default hide/unhide logic
                const toHide = changedClients.filter(c => !c.visible).map(c => c.id);
                const toUnhide = changedClients.filter(c => c.visible).map(c => c.id);

                if (toHide.length > 0) {
                    await dispatch(hideClients(toHide)).unwrap();
                }
                if (toUnhide.length > 0) {
                    await dispatch(unhideClients(toUnhide)).unwrap();
                }

                if (currentDateRange && (toHide.length > 0 || toUnhide.length > 0)) {
                    await dispatch(fetchAllAccountSummary({
                        startDate: currentDateRange.startDate,
                        endDate: currentDateRange.endDate,
                    }));
                }
            }

            onChange(localClients);
            setIsDirty(false);
            setAnchorEl(null); // Close dropdown after update
            setSearchQuery(""); // Clear search
        } catch (err) {
            console.error("Bulk update error:", err);
            // Revert on error
            setLocalClients(clients);
            setIsDirty(false);
        } finally {
            setLoadingClientId(null);
        }
    };

    const handleClose = () => {
        if (!isDirty || !enableUpdateButton) {
            setAnchorEl(null);
            setSearchQuery(""); // Clear search on close
        }
    };

    const visibleCount = localClients.filter(c => c.visible).length;
    const totalCount = localClients.length;

    useEffect(() => {
        // Only update if clients actually changed
        if (JSON.stringify(clients) !== JSON.stringify(localClients)) {
            setLocalClients(clients);
            setIsDirty(false);
        }
    }, [clients]); // Remove localClients from dependency

    return (
        <Box>
            {/* Trigger Button */}
            <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "2px solid #e5e7eb",
                    borderRadius: 1,
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    width: buttonWidth,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                        borderColor: "#d1d5db",
                    }
                }}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    {showIcon && (
                        <img
                            src={iconSrc}
                            alt="icon"
                            style={{ width: 20, height: 20, objectFit: "contain" }}
                        />
                    )}
                    <Typography fontSize={14} fontWeight={500} color="#374151">
                        {label}
                    </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography
                        fontWeight={500}
                        fontSize={14}
                        sx={{
                            color: "#374151",
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                        }}
                    >
                        {visibleCount === totalCount ? 'All' : `${visibleCount}/${totalCount}`}
                    </Typography>

                    {open ? (
                        <KeyboardArrowUpIcon fontSize="small" sx={{ color: "#6b7280" }} />
                    ) : (
                        <KeyboardArrowDownIcon fontSize="small" sx={{ color: "#6b7280" }} />
                    )}
                </Box>
            </Box>

            {/* Dropdown Menu */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                disableAutoFocusItem
                PaperProps={{
                    sx: {
                        width: 280,
                        maxHeight: "400px !important",
                        borderRadius: 2,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        mt: 0.5,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
                MenuListProps={{
                    sx: {
                        py: 0,
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        overflow: "hidden",
                        maxHeight: "none !important",
                    }
                }}
            >
                {/* Header */}
                <Box sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    flexShrink: 0,
                }}>
                    <Typography
                        fontSize={13}
                        color="#6b7280"
                        fontWeight={600}
                        letterSpacing={0.3}
                    >
                        {visibleCount} of {totalCount} {itemName} visible
                    </Typography>
                </Box>

                {/* Search Bar */}
                <Box sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    flexShrink: 0,
                }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={`Search ${itemName}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: "#9ca3af" }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <CloseIcon
                                        sx={{
                                            fontSize: 18,
                                            color: "#9ca3af",
                                            cursor: "pointer",
                                            "&:hover": { color: "#6b7280" }
                                        }}
                                        onClick={() => setSearchQuery("")}
                                    />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                fontSize: 14,
                                borderRadius: 1.5,
                                bgcolor: "#f9fafb",
                                "& fieldset": {
                                    borderColor: "#e5e7eb",
                                },
                                "&:hover fieldset": {
                                    borderColor: "#d1d5db",
                                },
                                "&.Mui-focused fieldset": {
                                    borderColor: primaryColor,
                                    borderWidth: "1px",
                                },
                            },
                        }}
                    />
                </Box>

                {/* Scrollable List */}
                <Box sx={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    "&::-webkit-scrollbar": {
                        width: "6px",
                    },
                    "&::-webkit-scrollbar-track": {
                        bgcolor: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: "#d1d5db",
                        borderRadius: "3px",
                        "&:hover": {
                            bgcolor: "#9ca3af",
                        }
                    }
                }}>
                    {filteredClients.length === 0 ? (
                        <Box sx={{
                            textAlign: "center",
                            py: 4,
                            color: "#9ca3af"
                        }}>
                            <Typography fontSize={14}>
                                No {itemName} found
                            </Typography>
                        </Box>
                    ) : (
                        filteredClients.map((client) => {
                            const isLoading = loadingClientId === client.id;

                            return (
                                <MenuItem
                                    key={client.id}
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "center",
                                        px: 2,
                                        py: 1.5,
                                        mx: 1,
                                        my: 0.5,
                                        borderRadius: 1.5,
                                        "&:hover": {
                                            bgcolor: "#f9fafb"
                                        },
                                        cursor: isLoading ? "not-allowed" : "pointer",
                                    }}
                                    onClick={() => !loadingClientId && handleToggle(client.id, client.visible)}
                                    disabled={!!loadingClientId}
                                >

                                    <IOSSwitch
                                        checked={client.visible}
                                        onChange={() => handleToggle(client.id, client.visible)}
                                        disabled={isLoading}
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    <Typography
                                        fontSize={14}
                                        fontWeight={500}
                                        color="#111827"
                                        sx={{
                                            maxWidth: 180,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {client.name}
                                    </Typography>
                                </MenuItem>
                            );
                        })
                    )}
                </Box>

                {/* Update Button - Fixed at Bottom */}
                {enableUpdateButton && (
                    <Box sx={{
                        bgcolor: "#fff",
                        borderTop: "1px solid #e5e7eb",
                        p: 1.5,
                        flexShrink: 0,
                    }}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleBulkUpdate}
                            disabled={!isDirty || loadingClientId === "bulk"}
                            sx={{
                                bgcolor: isDirty ? primaryColor : "#e5e7eb",
                                color: isDirty ? "#fff" : "#9ca3af",
                                fontWeight: 600,
                                fontSize: 14,
                                py: 1,
                                borderRadius: 1.5,
                                textTransform: "none",
                                boxShadow: "none",
                                "&:hover": {
                                    bgcolor: isDirty ? primaryColor : "#e5e7eb",
                                    boxShadow: isDirty ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
                                },
                                "&.Mui-disabled": {
                                    bgcolor: "#e5e7eb",
                                    color: "#9ca3af",
                                },
                            }}
                        >
                            {loadingClientId === "bulk" ? (
                                <CustomLoader size={20} color="inherit" />
                            ) : (
                                "Apply"
                            )}
                        </Button>
                    </Box>
                )}
            </Menu>
        </Box>
    );
};

export default VisibleClientsDropdown;