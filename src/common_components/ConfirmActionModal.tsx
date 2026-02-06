import React from "react";
import { Dialog, DialogContent, Box, Typography } from "@mui/material";
import AppButton from "./AppButton";
import CustomLoader from "./CustomLoader";
// import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface ConfirmActionModalProps {
    open: boolean;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    className?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    open,
    title,
    description,
    icon,
    className,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onClose,
    loading = false,
}) => {
    if (!open) return null;

    return (
        <Dialog
            open={open}
            maxWidth="xs"
            fullWidth
            onClose={loading ? undefined : onClose}
            className={`dialog-popup-container ${className || ""}`}
        >
            <DialogContent className="delete-popup-box">
                <Box textAlign="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            mx: "auto",
                            mb: 2,
                            borderRadius: "50%",
                            backgroundColor: "#FEE4E2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {icon || (
                            <div className="d-flex">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16m-10 4v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="#f04438" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                    </Box>

                    <Typography fontSize={18} fontWeight={600} mb={1} className="popup-title-delete">
                        {title}
                    </Typography>

                    {description && (
                        <Typography fontSize={14} color="#667085" mb={3} className="delete-popup-desc">
                            {description}
                        </Typography>
                    )}

                    <div className="d-flex popup-action-button-group">
                        <AppButton
                            className="close-popup-button"
                            fullWidth
                            variant="outlined"
                            disabled={loading}
                            onClick={onClose}
                        >
                            {cancelText}
                        </AppButton>

                        <AppButton
                            className="submit-popup-btn"
                            fullWidth
                            disabled={loading}
                            color="primary"
                            variant="contained"
                            onClick={onConfirm}
                            sx={{
                                backgroundColor: "#D92D20",
                                "&:hover": { backgroundColor: "#B42318" },
                            }}
                        >
                            {
                                loading ? <CustomLoader color="inherit" /> : confirmText
                            }
                            
                        </AppButton>
                    </div>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmActionModal;
