import React, { useState, useMemo, useEffect } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import AllPermissions, { ModuleData } from "./AllPermissions";
import { ModulePermission } from "../redux/permissionsSlice";
import { useSelector } from "react-redux";
import { selectModules } from "../redux/userDataSlice";
import { selectToken } from "../redux/authSlice";
import { ApiCall } from "../helper/axios";
import { AxiosResponse, AxiosError } from "axios";
import CustomLoader from "./CustomLoader";
import useToast from "./Toast/useToast";
import "../App.css";
import AppButton from "./AppButton";

const drawerWidth = 800;

interface OverrideRoleDrawerProps {
    open: boolean;
    onClose: () => void;
    roleName?: string;
    userId?: string; // User ID for API call
    onSave?: (data: { roleName: string; permissions: { [moduleKey: string]: ModulePermission }; overrides: { [moduleKey: string]: ModulePermission } }) => void;
    type?: string;
    initialPermissions?: { [moduleKey: string]: ModulePermission }; // User permissions from API
    initialOverrides?: { [moduleKey: string]: ModulePermission }; // User overrides from API (priority over permissions)
}

interface ApiErrorResponse {
    message?: string;
    success?: boolean;
}

export default function OverrideRoleDrawer({
    open,
    onClose,
    roleName = "Account Manager",
    userId,
    onSave,
    type,
    initialPermissions,
    initialOverrides
}: OverrideRoleDrawerProps) {
    const [permissions, setPermissions] = useState<{ [moduleKey: string]: ModulePermission }>({});
    const [loading, setLoading] = useState(false);
    const modulesFromRedux = useSelector(selectModules);
    const token = useSelector(selectToken);
    const toast = useToast();
    console.log('roleName', roleName);
    
    // Convert Redux modules to ModuleData format
    // Helper function to recursively convert sub_modules to sub_module
    const convertModule = (m: any): ModuleData => {
        const subModules = m.sub_modules || m.sub_module || [];
        return {
            _id: m._id || m.id,
            key: m.key || m._id || m.id,
            module_name: m.module_name || m.name || "",
            order: m.order || 0,
            permissions: m.permissions || {},
            sub_module: subModules.map((sub: any) => convertModule(sub)),
            is_parent: m.is_parent || false,
            url: m.url || "",
        };
    };

    const modules: ModuleData[] = useMemo(() => {
        if (!modulesFromRedux || modulesFromRedux.length === 0) {
            return [];
        }
        return (modulesFromRedux || []).map((m: any) => convertModule(m));
    }, [modulesFromRedux]);

    const handleSave = async () => {
        if (!userId) {
            toast.error("User ID is required");
            return;
        }

        setLoading(true);
        try {
            // Transform permissions to API format
            const apiPermissions: { [key: string]: any } = {};
            
            Object.keys(permissions).forEach((moduleKey) => {
                const perm = permissions[moduleKey];
                
                // Always include the module with all required keys
                // Use default values if keys are missing
                apiPermissions[moduleKey] = {
                    access: perm.access !== undefined ? perm.access : false,
                    actions: Array.isArray(perm.actions) ? perm.actions : [],
                    client_scope: perm.client_scope || "assigned",
                    refresh: perm.refresh !== undefined ? perm.refresh : false,
                };
            });

            // Payload structure: use 'overrides' key instead of 'permissions', don't include 'roleName'
            const payload = {
                overrides: apiPermissions,
            };

            // Log the payload
            console.log("Override Role Payload:", payload);

            // Make PUT API call to /api/users/{user_id}/overrides
            const res = await ApiCall(
                "PUT",
                `/api/users/${userId}/overrides`,
                payload,
                {
                    Authorization: token || "",
                }
            );

            if (res && 'data' in res && res?.data?.success) {
                toast.success((res as AxiosResponse).data?.message || "Role override saved successfully");
                
                // Get the saved overrides from API response (if available)
                // API response format: { data: { user: { overrides: {...} } } } or { data: { overrides: {...} } }
                const responseData = (res as AxiosResponse).data?.data;
                const savedOverrides = responseData?.user?.overrides || responseData?.overrides || apiPermissions;
                
                // Call onSave callback with override data
                if (onSave) {
                    onSave({
                        roleName: roleName,
                        permissions,
                        overrides: savedOverrides
                    });
                }
                
                onClose();
            } else {
                const errorRes = res as AxiosError<ApiErrorResponse>;
                toast.error(errorRes?.response?.data?.message || "Failed to save role override");
            }
        } catch (error) {
            console.error("Error saving role override:", error);
            toast.error("Something went wrong while saving role override");
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionsChange = (newPermissions: { [moduleKey: string]: ModulePermission }) => {
        setPermissions(newPermissions);
    };

    // Initialize permissions when drawer opens
    // Priority: initialOverrides > initialPermissions > module.permissions > defaults
    // Use overrides if available, otherwise fall back to permissions
    useEffect(() => {
        if (open && modules.length > 0) {
            const initialPerms: { [moduleKey: string]: ModulePermission } = {};

            // Helper function to recursively get all child modules
            const getAllChildModules = (moduleList: ModuleData[]): ModuleData[] => {
                const children: ModuleData[] = [];
                moduleList.forEach((module) => {
                    if (module.sub_module && module.sub_module.length > 0) {
                        children.push(...getAllChildModules(module.sub_module));
                    } else {
                        // This is a leaf node (actual child module)
                        children.push(module);
                    }
                });
                return children;
            };

            // Get all child modules (leaf nodes only)
            const allChildModules = getAllChildModules(modules);

            // Process each child module
            // Priority 1: Use initialOverrides (user-specific overrides) if available
            // Priority 2: Use initialPermissions (default permissions) if available
            // Priority 3: Use module.permissions from modules API as default values
            // Priority 4: Hardcoded default values
            allChildModules.forEach((module) => {
                // Priority 1: Use initialOverrides if available (user-specific overrides)
                if (initialOverrides && initialOverrides[module.key]) {
                    const overridePerms = initialOverrides[module.key];
                    initialPerms[module.key] = {
                        access: overridePerms.access !== undefined ? overridePerms.access : false,
                        actions: Array.isArray(overridePerms.actions) ? overridePerms.actions : [],
                        client_scope: overridePerms.client_scope || "assigned",
                        refresh: overridePerms.refresh !== undefined ? overridePerms.refresh : false,
                    };
                }
                // Priority 2: Use initialPermissions if available (default permissions)
                else if (initialPermissions && initialPermissions[module.key]) {
                    const userPerms = initialPermissions[module.key];
                    initialPerms[module.key] = {
                        access: userPerms.access !== undefined ? userPerms.access : false,
                        actions: Array.isArray(userPerms.actions) ? userPerms.actions : [],
                        client_scope: userPerms.client_scope || "assigned",
                        refresh: userPerms.refresh !== undefined ? userPerms.refresh : false,
                    };
                }
                // Priority 3: Use module.permissions from modules API as default values
                else if (module.permissions !== undefined && module.permissions !== null) {
                    const modulePerms = module.permissions;
                    initialPerms[module.key] = {
                        access: modulePerms.access !== undefined ? modulePerms.access : false,
                        // Don't pre-select actions - user will select manually
                        actions: [],
                        client_scope: modulePerms.client_scope || "assigned",
                        refresh: modulePerms.refresh !== undefined ? modulePerms.refresh : false,
                    };
                }
                // Priority 4: Hardcoded default values
                else {
                    initialPerms[module.key] = {
                        access: false,
                        actions: [],
                        client_scope: "assigned",
                        refresh: false,
                    };
                }
            });

            setPermissions(initialPerms);
        } else if (open) {
            setPermissions({});
        }
    }, [open, modules, initialPermissions, initialOverrides]);

    return (
        <Drawer
            className={`form-input-root ${type || ""}`}
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                zIndex: 1301, // Higher than UserDrawer (1300)
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    backgroundColor: '#fdfdfd'
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        height: '60px',
                        borderBottom: '1px solid #e9eaeb',
                        backgroundColor: '#fafafa'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                        <div className="line"></div>
                        <Typography
                            sx={{
                                fontSize: '16px',
                                fontWeight: 500,
                                color: '#18181b',
                                lineHeight: '24px'
                            }}
                            className="drawer-main-title"
                        >
                            Override Role
                        </Typography>
                    </Box>
                    <AppButton
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        startIcon={<SaveIcon />}
                        // startIcon={loading ? <CustomLoader sx={{ color: 'white' }} size={18} /> : <SaveIcon />}
                        disabled={loading || !userId}
                        className="app-common-button"
                        >
                        {loading ? <CustomLoader sx={{ color: 'white' }} size={18} /> : 'Save'}
                    </AppButton>
                </Box>

                {/* Content */}
                <div className="override-sidepopup-container">
                    {/* Role Name Field */}
                    <div className="override-textfield">
                        <TextField
                            label="Role Name"
                            value={roleName}
                            fullWidth
                            disabled
                        />
                    </div>

                    {/* All Permissions Component */}
                    <div className="sidebar-popup-all-permission">
                        <AllPermissions
                            modules={modules}
                            permissions={permissions}
                            onChange={handlePermissionsChange}
                            disabled={false}
                        />
                    </div>
                </div>
            </Box>
        </Drawer>
    );
}
