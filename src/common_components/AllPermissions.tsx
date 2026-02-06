import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    Typography,
    Checkbox,
    TextField,
    InputAdornment,
    IconButton,
    SvgIcon,
    Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import MultiSelectInput, { Option } from "./MultiSelectInput";
import { ModulePermission } from "../redux/permissionsSlice";
import AppButton from "./AppButton";

export interface ModuleData {
    _id: string;
    key: string;
    module_name: string;
    order: number;
    permissions?: {
        access?: boolean;
        actions?: string[];
        client_scope?: "assigned" | "all";
        refresh?: boolean;
    };
    sub_module?: ModuleData[];
    is_parent?: boolean;
    url?: string;
}

interface AllPermissionsProps {
    modules: ModuleData[];
    permissions: { [moduleKey: string]: ModulePermission };
    onChange: (permissions: { [moduleKey: string]: ModulePermission }) => void;
    disabled?: boolean;
}

/**
 * Reusable AllPermissions component with full Figma design features
 */
export default function AllPermissions({
    modules,
    permissions = {},
    onChange,
    disabled = false,
}: AllPermissionsProps) {

    const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});
    const [searchText, setSearchText] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    console.log('permissions', permissions);
    
    // Get all child modules (non-parent modules that have sub_modules)
    const getChildModules = useCallback((moduleList: ModuleData[]): ModuleData[] => {
        const children: ModuleData[] = [];
        moduleList.forEach((module) => {
            // If module has sub_modules, get its children recursively
            if (module.sub_module && module.sub_module.length > 0) {
                children.push(...getChildModules(module.sub_module));
            } else {
                // This is a leaf node (actual child module)
                children.push(module);
            }
        });
        return children;
    }, []);

    // Helper function to sort modules by order recursively
    const sortModulesByOrder = (moduleList: ModuleData[]): ModuleData[] => {
        return [...moduleList]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((module) => {
                if (module.sub_module && module.sub_module.length > 0) {
                    return {
                        ...module,
                        sub_module: sortModulesByOrder(module.sub_module),
                    };
                }
                return module;
            });
    };

    // Get root modules (top-level parents) and non-parent modules) - sorted by order
    const rootModules = useMemo(() => {
        return sortModulesByOrder(modules);
    }, [modules]);
    
    // Get all child modules (leaf nodes only, not parents) for bulk operations
    const getAllChildModules = useCallback((moduleList: ModuleData[]): ModuleData[] => {
        const children: ModuleData[] = [];

        moduleList.forEach((module) => {
            if (module.sub_module && module.sub_module.length > 0) {
                children.push(...getAllChildModules(module.sub_module));
            } else {
                children.push(module);
            }
        });

        return children;
    }, []);

    // Get all child modules for bulk checkbox operations
    const allChildModules = useMemo(() => {
        return getAllChildModules(modules);
    }, [modules, getAllChildModules]);

    // Filter child modules based on search (for bulk operations)
    const filteredChildModules = useMemo(() => {
        if (!searchText.trim()) return allChildModules;
        const searchLower = searchText.toLowerCase();
        return allChildModules.filter((m) =>
            m.module_name.toLowerCase().includes(searchLower)
        );
    }, [allChildModules, searchText]);

    // Get children of a parent module
    const getChildren = useCallback(
        (parentKey: string, moduleList: ModuleData[] = modules): ModuleData[] => {
            const result: ModuleData[] = [];
            moduleList.forEach((module) => {
                if (module.key === parentKey && module.sub_module) {
                    module.sub_module.forEach((child) => {
                        result.push(child);
                        // Recursively get nested children
                        if (child.sub_module && child.sub_module.length > 0) {
                            result.push(...getChildren(child.key, [child]));
                        }
                    });
                } else if (module.sub_module) {
                    // Recursively search in sub_modules
                    result.push(...getChildren(parentKey, module.sub_module));
                }
            });
            return result;
        },
        [modules]
    );

    // Recursively get all parent modules (any module with children, including nested)
    const getAllParentModules = useCallback((moduleList: ModuleData[]): string[] => {
        const parentKeys: string[] = [];
        moduleList.forEach((module) => {
            // Get any module that has sub_modules (not just is_parent)
            if (module.sub_module && module.sub_module.length > 0) {
                parentKeys.push(module.key);
                // Recursively get nested parents
                if (module.sub_module) {
                    parentKeys.push(...getAllParentModules(module.sub_module));
                }
            }
        });
        return parentKeys;
    }, []);

    // Initialize: Expand all modules by default on mount
    useEffect(() => {
        if (rootModules.length > 0) {
            setExpandedModules((prev) => {
                // Only initialize if expandedModules is empty
                if (Object.keys(prev).length === 0) {
                    const allParentKeys = getAllParentModules(rootModules);
                    const initialExpandedState: { [key: string]: boolean } = {};
                    allParentKeys.forEach((key) => {
                        initialExpandedState[key] = true; // Expand all by default
                    });
                    return initialExpandedState;
                }
                return prev;
            });
            // Set arrow to up (expanded state)
            setIsCollapsed(false);
        }
    }, [rootModules, getAllParentModules]); // Run when modules change

    // Toggle module expansion
    const toggleModule = (moduleKey: string) => {
        setExpandedModules((prev) => ({
            ...prev,
            [moduleKey]: !prev[moduleKey],
        }));
    };

    // Handle global expand/collapse all (all parents and nested parents)
    const handleGlobalExpandCollapse = () => {
        const allParentKeys = getAllParentModules(rootModules);
        const newCollapsedState = !isCollapsed;
        
        // Create new expanded state: if collapsing (newCollapsedState = true), set all to false; if expanding (newCollapsedState = false), set all to true
        const newExpandedState: { [key: string]: boolean } = {};
        allParentKeys.forEach((key) => {
            newExpandedState[key] = !newCollapsedState; // inverse: collapsed = false expanded, expanded = true expanded
        });
        
        setExpandedModules(newExpandedState);
        setIsCollapsed(newCollapsedState);
    };

    // Handle module access toggle
    const handleAccessToggle = (moduleKey: string, hasAccess: boolean) => {
        const updatedPermissions = { ...permissions };

        if (!updatedPermissions[moduleKey]) {
            updatedPermissions[moduleKey] = {
                access: false,
                actions: [],
                client_scope: "assigned", // Default to "assigned" (OFF)
            };
        }

        // Get the module to check if it has permissions from API
        const module = allChildModules.find(m => m.key === moduleKey);
        const hasPermissionsFromAPI = module?.permissions !== undefined && module?.permissions !== null;
        
        // Preserve existing client_scope if it exists, otherwise set to "assigned"
        const existingClientScope = updatedPermissions[moduleKey].client_scope;
        
        updatedPermissions[moduleKey] = {
            ...updatedPermissions[moduleKey],
            access: hasAccess,
            // If access is turned off, clear actions, set refresh to false, and set client_scope to "assigned"
            ...(hasAccess ? {
                // When access is ON, preserve existing client_scope if it exists, otherwise use default from API or "assigned"
                client_scope: existingClientScope || (hasPermissionsFromAPI ? (module?.permissions?.client_scope || "assigned") : "assigned")
            } : { 
                actions: [], 
                refresh: false,
                client_scope: "assigned" // Set to "assigned" (OFF) when access is OFF
            }),
        };

        // If access is turned off, also turn off for all nested children
        if (!hasAccess) {
            const children = getChildren(moduleKey);
            children.forEach((child) => {
                if (!updatedPermissions[child.key]) {
                    updatedPermissions[child.key] = {
                        access: false,
                        actions: [],
                        refresh: false,
                        client_scope: "assigned", // Set to "assigned" (OFF)
                    };
                } else {
                    updatedPermissions[child.key] = {
                        ...updatedPermissions[child.key],
                        access: false,
                        actions: [],
                        refresh: false,
                        client_scope: "assigned", // Set to "assigned" (OFF)
                    };
                }
            });
        }

        onChange(updatedPermissions);
    };

    // Handle bulk column toggle (checkbox in header)
    const handleBulkColumnToggle = (columnType: "access" | "clientScope" | "refresh" | "actions", checked: boolean) => {
        const updatedPermissions = { ...permissions };

        filteredChildModules.forEach((module) => {
            if (!updatedPermissions[module.key]) {
                updatedPermissions[module.key] = {
                    access: false,
                    actions: [],
                    client_scope: "assigned", // Default to "assigned" (OFF)
                };
            }

            if (columnType === "access") {
                updatedPermissions[module.key].access = checked;
                if (!checked) {
                    // Turn off everything else when access is off
                    updatedPermissions[module.key].actions = [];
                    updatedPermissions[module.key].refresh = false;
                    updatedPermissions[module.key].client_scope = "assigned"; // Set to "assigned" (OFF)
                } else {
                    // When access is turned ON, preserve existing client_scope or set to "assigned" (don't auto-set to "all")
                    // Only set client_scope if it doesn't exist
                    if (!updatedPermissions[module.key].client_scope) {
                        const hasPermissionsFromAPI = module.permissions !== undefined && module.permissions !== null;
                        updatedPermissions[module.key].client_scope = hasPermissionsFromAPI 
                            ? (module.permissions?.client_scope || "assigned") 
                            : "assigned";
                    }
                    // Don't change existing client_scope value when access is turned ON
                }
            } else if (columnType === "clientScope") {
                if (updatedPermissions[module.key].access) {
                    updatedPermissions[module.key].client_scope = checked ? "all" : "assigned";
                }
            } else if (columnType === "refresh") {
                if (updatedPermissions[module.key].access) {
                    updatedPermissions[module.key].refresh = checked;
                }
            } else if (columnType === "actions") {
                if (updatedPermissions[module.key].access) {
                    const availableActions = getAvailableActions(module);
                    updatedPermissions[module.key].actions = checked ? availableActions : [];
                }
            }
        });

        onChange(updatedPermissions);
    };

    // Handle actions change
    const handleActionsChange = (moduleKey: string, actions: string[]) => {
        const updatedPermissions = { ...permissions };

        if (!updatedPermissions[moduleKey]) {
            updatedPermissions[moduleKey] = {
                access: true,
                actions: [],
            };
        }

        updatedPermissions[moduleKey] = {
            ...updatedPermissions[moduleKey],
            actions,
        };

        onChange(updatedPermissions);
    };

    // Handle client scope toggle
    const handleClientScopeToggle = (moduleKey: string, isAll: boolean) => {
        const updatedPermissions = { ...permissions };

        if (!updatedPermissions[moduleKey]) {
            updatedPermissions[moduleKey] = {
                access: true,
                actions: [],
            };
        }

        updatedPermissions[moduleKey] = {
            ...updatedPermissions[moduleKey],
            client_scope: isAll ? "all" : "assigned",
        };

        onChange(updatedPermissions);
    };

    // Handle refresh toggle
    const handleRefreshToggle = (moduleKey: string, refresh: boolean) => {
        const updatedPermissions = { ...permissions };

        if (!updatedPermissions[moduleKey]) {
            updatedPermissions[moduleKey] = {
                access: true,
                actions: [],
            };
        }

        updatedPermissions[moduleKey] = {
            ...updatedPermissions[moduleKey],
            refresh,
        };

        onChange(updatedPermissions);
    };

    // Get available actions for a module (from API data)
    const getAvailableActions = (module: ModuleData): string[] => {
        // Get actions from module permissions (API response)
        if (module.permissions?.actions && module.permissions.actions.length > 0) {
            return module.permissions.actions;
        }
        return [];
    };

    // Check if all modules in a column have the same value
    const checkColumnState = (
        columnType: "access" | "clientScope" | "refresh" | "actions"
    ) => {
    
        const applicableModules = allChildModules.filter((module) => {
    
            // ✅ N/A modules ko ignore
            if (columnType === "access") {
                return module.permissions?.access !== undefined;
            }
    
            const perms = permissions[module.key];
            if (!perms || !perms.access) return false;
    
            if (columnType === "clientScope") {
                return module.permissions?.client_scope !== undefined;
            }
    
            if (columnType === "refresh") {
                return module.permissions?.refresh !== undefined;
            }
    
            if (columnType === "actions") {
                return (
                    Array.isArray(module.permissions?.actions) &&
                    module.permissions.actions.length > 0
                );
            }
    
            return false;
        });
    
        if (applicableModules.length === 0) {
            return { checked: false, indeterminate: false };
        }
    
        let onCount = 0;
    
        applicableModules.forEach((module) => {
            const perms = permissions[module.key];
    
            if (!perms) return;
    
            if (columnType === "access" && perms.access === true) onCount++;
            if (columnType === "clientScope" && perms.client_scope === "all") onCount++;
            if (columnType === "refresh" && perms.refresh === true) onCount++;
    
            if (columnType === "actions") {
                const availableActions = module.permissions?.actions ?? [];
                const selectedActions = perms.actions ?? [];
                if (
                    availableActions.length > 0 &&
                    selectedActions.length === availableActions.length
                ) {
                    onCount++;
                }
            }
        });
    
        if (onCount === applicableModules.length) {
            return { checked: true, indeterminate: false };
        }
    
        if (onCount > 0) {
            return { checked: false, indeterminate: true };
        }
    
        return { checked: false, indeterminate: false };
    };
    
    // Check if module or any of its children match search
    const moduleMatchesSearch = useCallback((module: ModuleData): boolean => {
        if (!searchText.trim()) return true;
        const searchLower = searchText.toLowerCase();
        if (module.module_name.toLowerCase().includes(searchLower)) return true;

        // Check if any child matches
        if (module.sub_module && module.sub_module.length > 0) {
            return module.sub_module.some((child) => moduleMatchesSearch(child));
        }
        return false;
    }, [searchText]);

    const visibleModules = useMemo(() => {
        if (!searchText.trim()) return rootModules;

        // sirf wo modules jinke child rows render honge
        return rootModules.filter((module) =>
            moduleMatchesSearch(module)
        );
    }, [rootModules, searchText, moduleMatchesSearch]);

    // Render parent module row (no columns, just name with expand/collapse)
    const renderParentRow = (module: ModuleData, level = 0) => {
        const hasChildren = module.sub_module && module.sub_module.length > 0;
        const isExpanded = expandedModules[module.key];
        const isFirstNestedParent = level === 1;
        const isUnderFirstNestedParent = level >= 2;
        console.log(level, '--------level');
        
        return (
            <TableRow
                key={`parent-${module.key}`}
                sx={{
                    "& > *": { borderBottom: "1px solid #e9eaeb" },
                    backgroundColor: "white",
                }}
                className={`sub-menu-dropdown-row ${level > 0 ? "sub-menu-dropdown-row--nested" : ""} ${isFirstNestedParent ? "parent-nested-list-item" : ""} ${isUnderFirstNestedParent ? "parent-nested-dropdown-item" : ""}`}
            >
                <TableCell
                    colSpan={6}
                    onClick={hasChildren ? () => toggleModule(module.key) : undefined}
                    sx={{
                        padding: "18px",
                        paddingLeft: level > 0 ? `${18 + level * 20}px` : "18px",
                        cursor: hasChildren ? "pointer" : "default",
                    }}
                    className={`sub-menu-dropdown ${level > 0 ? "sub-menu-dropdown--nested" : ""} ${isFirstNestedParent ? "parent-nested-list-item" : ""} ${isUnderFirstNestedParent ? "parent-nested-dropdown-item" : ""}`}
                >
                    <div className="flex-sub-menu">
                        {hasChildren && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent double toggle
                                    toggleModule(module.key);
                                }}
                                sx={{
                                    padding: 0,
                                    width: "18px",
                                    height: "18px",
                                }}
                            >
                                {isExpanded ? (
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.278 11.876 14.1 6.904c.301-.31.119-.904-.278-.904H4.178c-.397 0-.579.593-.278.904l4.822 4.972c.16.165.396.165.556 0" fill="#000"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.876 8.722 6.904 3.9C6.594 3.599 6 3.78 6 4.178v9.644c0 .397.593.579.904.278l4.972-4.822a.374.374 0 0 0 0-.556" fill="#000"/></svg>  
                                )}
                            </IconButton>
                        )}
                        {!hasChildren && <Box sx={{ width: "18px" }} />}
                        <Typography
                            sx={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#27272a",
                                lineHeight: "20px",
                            }}
                        >
                            {module.module_name}
                        </Typography>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    // Render child module row (with all columns)
    const renderChildRow = (module: ModuleData, level = 0) => {

        const perms = module.permissions || {};

        const hasAccessKey = "access" in perms;
        const hasClientScopeKey = "client_scope" in perms;
        const hasRefreshKey = "refresh" in perms;

        const hasActionsKey =
            Array.isArray(perms.actions) && perms.actions.length > 0;
        // Check if module has permissions from API
        const hasPermissionsFromAPI = module.permissions !== undefined && module.permissions !== null;

        // Initialize from API data if available, otherwise from state
        const modulePerms = permissions[module.key] || {
            access: hasPermissionsFromAPI ? (module.permissions?.access || false) : false,
            actions: hasPermissionsFromAPI ? (module.permissions?.actions || []) : [],
            client_scope: hasPermissionsFromAPI ? (module.permissions?.client_scope || "assigned") : "assigned",
            refresh: hasPermissionsFromAPI ? (module.permissions?.refresh || false) : false,
        };
        
        const hasAccess = modulePerms.access === true;
        const clientScope = modulePerms.client_scope;
        const isClientScopeAll = clientScope === "all";
        const refresh = modulePerms.refresh === true;

        // Get available actions
        const availableActions = getAvailableActions(module);
        const selectedActions = modulePerms.actions || [];
        const hasActions = availableActions.length > 0;

        // Show N/A only if permissions object doesn't exist from API
        const showNA = !hasPermissionsFromAPI;

        // Convert actions to MultiSelectInput options
        const actionOptions: Option[] = availableActions.map((action) => ({
            value: action,
            label: action,
        }));

        // Check if module matches search
        if (!moduleMatchesSearch(module)) return null;

        const isFirstNestedChild = level === 1;
        const isUnderFirstNestedParent = level >= 2;

        return (
            <TableRow
                key={module.key}
                sx={{
                    "& > *": { borderBottom: "1px solid #e9eaeb" },
                    backgroundColor: "white",
                }}
                className={`sub-content-row ${isFirstNestedChild ? "parent-nested-list-item" : ""} ${isUnderFirstNestedParent ? "parent-nested-dropdown-item" : ""}`}
            >
                <TableCell
                    sx={{
                        padding: "18px",
                        paddingLeft: level > 0 ? `${18 + level * 20}px` : "18px",
                        width: "auto",
                    }}
                    className={`sub-empty-data ${isFirstNestedChild ? "parent-nested-list-item" : ""} ${isUnderFirstNestedParent ? "parent-nested-dropdown-item" : ""}`}
                >
                <div className="one-line"></div>
                </TableCell>
                <TableCell className={`sub-content-data ${isFirstNestedChild ? "parent-nested-list-item" : ""} ${isUnderFirstNestedParent ? "parent-nested-dropdown-item" : ""}`}>
                    <Typography
                        sx={{
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#27272a",
                            lineHeight: "20px",
                        }}
                    >
                        {module.module_name}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    {!hasAccessKey ? (
                        <Typography sx={{ fontStyle: "italic", color: "#71717a" }} className="not-aaplicable-txt">
                            N/A
                        </Typography>
                    ) : (
                        <Switch
                            checked={hasAccess}
                            onChange={(e) =>
                                handleAccessToggle(module.key, e.target.checked)
                            }
                        />
                    )}
                </TableCell>

                <TableCell align="center">
                    {!hasClientScopeKey ? (
                        <Typography sx={{ fontStyle: "italic", color: "#71717a" }} className="not-aaplicable-txt">
                            N/A
                        </Typography>
                    ) : hasAccess ? (
                        <Switch
                            checked={isClientScopeAll}
                            onChange={(e) =>
                                handleClientScopeToggle(module.key, e.target.checked)
                            }
                        />
                    ) : (
                        <Switch disabled />
                    )}
                </TableCell>

                <TableCell align="center">
                    {!hasRefreshKey ? (
                        <Typography sx={{ fontStyle: "italic", color: "#71717a" }} className="not-aaplicable-txt">
                            N/A
                        </Typography>
                    ) : hasAccess ? (
                        <Switch
                            checked={refresh}
                            onChange={(e) =>
                                handleRefreshToggle(module.key, e.target.checked)
                            }
                        />
                    ) : (
                        <Switch disabled />
                    )}
                </TableCell>

                <TableCell>
                    {!hasActionsKey ? (
                        <Typography sx={{ fontStyle: "italic", color: "#71717a" }} className="not-aaplicable-txt">
                            N/A
                        </Typography>
                    ) : hasAccess ? (
                        <MultiSelectInput
                            label=""
                            name={`actions-${module.key}`}
                            value={selectedActions}
                            options={actionOptions}
                            placeholder="Select Action"
                            maxDisplay={2}
                            disabled={disabled || !hasAccess}
                            onChange={(e) =>
                                handleActionsChange(
                                    module.key,
                                    e.target.value as string[]
                                )
                            }
                        />
                    ) : (
                        <Box sx={{ opacity: 0.5 }}>
                            Select Action
                        </Box>
                    )}
                </TableCell>

            </TableRow>
        );
    };

    // Render module tree recursively
    const renderModuleTree = (module: ModuleData, level = 0): React.ReactNode[] => {
        const result: React.ReactNode[] = [];

        const hasChildren =
            Array.isArray(module.sub_module) && module.sub_module.length > 0;

        // search filter
        if (!moduleMatchesSearch(module)) return result;

        /**
         * CASE 1:
         * Module has children → render expandable parent
         */
        if (hasChildren) {
            result.push(renderParentRow(module, level));

            if (expandedModules[module.key]) {
                // Sort sub_modules by order before rendering
                const sortedSubModules = [...(module.sub_module || [])].sort(
                    (a, b) => (a.order || 0) - (b.order || 0)
                );
                sortedSubModules.forEach((child) => {
                    result.push(...renderModuleTree(child, level + 1));
                });
            }
            return result;
        }

        /**
         * CASE 2:
         * Module has NO children → render as normal permission row
         * (Active Clients case)
         */
        result.push(renderChildRow(module, level));
        return result;
    };


    const accessColumnState = checkColumnState("access");
    const clientScopeColumnState = checkColumnState("clientScope");
    const refreshColumnState = checkColumnState("refresh");
    const actionsColumnState = checkColumnState("actions");


    const UncheckedIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24" style={{ fill: "#D5D7DA" }}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="#D5D7DA" strokeWidth="2" />
    </SvgIcon>
    );

    const CheckedIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24" style={{ fill: "#7F56D9" }}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="transparent" stroke="rgb(127, 86, 217)" />
        <path d="M6 12l4 4 8-8" fill="none" stroke="rgb(127, 86, 217)" strokeWidth="2" />
    </SvgIcon>
    );

    const IndeterminateIcon = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24" style={{ fill: "#7F56D9" }}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="transparent" stroke="rgb(127, 86, 217)" />
        <rect x="6" y="11" width="12" height="1" fill="none" stroke="rgb(127, 86, 217)" strokeWidth="1"  />
    </SvgIcon>
    );


    return (
        <div className="role-permission-page-actions-list">
            <div className="all-permission-container">
                {/* Header with title and search */}
                <div className="all-permission-table-title-header">
                    <Typography className="all-permission-main-title">
                        All Permissions
                    </Typography>
                    <div className="search-box-conainer">
                        <div className="searchbox-card">
                            <div className="d-flex search-icon-position">
                                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m14 14-2.9-2.9m1.567-3.767A5.333 5.333 0 1 1 2 7.333a5.333 5.333 0 0 1 10.667 0" stroke="#3f3f46" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <TextField
                                className="search-input-module"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search Module"
                                variant="standard"
                                InputProps={{
                                    disableUnderline: true,
                                }}
                            />
                            {searchText && (
                                <IconButton
                                    className="close-search"
                                    size="small"
                                    onClick={() => setSearchText("")}
                                    sx={{ padding: 0, width: "16px", height: "16px" }}
                                >
                                    <CloseIcon sx={{ fontSize: "14px" }} />
                                </IconButton>
                            )}
                        </div>
                    </div>
                </div>

                <TableContainer
                    component={Paper}>
                    <Table className="role-permission-table">
                        <TableHead className="t-head">
                            <TableRow sx={{ backgroundColor: "#f4f4f5" }} className="t-row">
                                {/* Expand/Collapse All Column */}
                                <TableCell className="t-data">
                                    <IconButton
                                        size="small"
                                        onClick={handleGlobalExpandCollapse}
                                        sx={{ padding: 0 }}
                                    >
                                        {isCollapsed ? (
                                            <KeyboardDoubleArrowDownIcon className="down-arrow-icon" />
                                        ) : (
                                            <KeyboardDoubleArrowUpIcon className="up-arrow-icon" />
                                        )}
                                    </IconButton>
                                </TableCell>

                                {/* Module Name Column Header */}
                                <TableCell className="t-data">
                                    <Typography className="table-head-title">
                                        Module Access
                                    </Typography>
                                </TableCell>

                                {/* Module Access Column */}
                                <TableCell className="t-data">
                                    <div className="flex-container">
                                        <Checkbox
                                            checked={accessColumnState.checked}
                                            indeterminate={accessColumnState.indeterminate}
                                            onChange={(e) => handleBulkColumnToggle("access", e.target.checked)}
                                            disabled={disabled}
                                            className="table-checkbox"
                                            icon={<UncheckedIcon />}
                                            checkedIcon={<CheckedIcon />}
                                            indeterminateIcon={<IndeterminateIcon />}
                                        />
                                        <Typography className="table-head-title">
                                            Module Access
                                        </Typography>
                                    </div>
                                </TableCell>

                                {/* Client Scope Column */}
                                <TableCell className="t-data">
                                    <div className="flex-container">
                                        <Checkbox
                                            checked={clientScopeColumnState.checked}
                                            indeterminate={clientScopeColumnState.indeterminate}
                                            onChange={(e) => handleBulkColumnToggle("clientScope", e.target.checked)}
                                            disabled={disabled}
                                            className="table-checkbox"
                                            icon={<UncheckedIcon />}
                                            checkedIcon={<CheckedIcon />}
                                            indeterminateIcon={<IndeterminateIcon />}
                                        />
                                        <Typography className="table-head-title">
                                            Client Scope
                                        </Typography>
                                        <Tooltip
                                            title={
                                                <div className="client-scope-tooltip">
                                                    <div className="client-scope-tooltip-line">
                                                        <span className="client-scope-asterisk">*</span>
                                                        <span className="client-scope-label">OFF:</span>
                                                        <span className="client-scope-toggle toggle-off">
                                                            <span className="toggle-track" />
                                                            <span className="toggle-thumb" />
                                                        </span>
                                                        <span className="client-scope-word">Assigned</span>
                                                    </div>
                                                    <div className="client-scope-tooltip-line">
                                                        <span className="client-scope-asterisk">*</span>
                                                        <span className="client-scope-label client-scope-label-on">ON:</span>
                                                        <span className="client-scope-toggle toggle-on">
                                                            <span className="toggle-track" />
                                                            <span className="toggle-thumb" />
                                                        </span>
                                                        <span className="client-scope-word">All</span>
                                                    </div>
                                                </div>
                                            }
                                            placement="top"
                                            arrow
                                            slotProps={{
                                                tooltip: { className: "client-scope-tooltip-wrapper" },
                                                arrow: { className: "client-scope-tooltip-arrow" },
                                            }}
                                        >
                                            <AppButton className="mui-tooltip-icon client-scope-icon">
                                                <div className="d-flex">
                                                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.667" stroke="#000"/><path d="M6.75 5.917a1.25 1.25 0 1 1 1.886 1.076c-.317.188-.636.472-.636.84v.834" stroke="#000" strokeLinecap="round"/><circle cx="8" cy="10.667" r=".667" fill="#000"/></svg>
                                                </div>
                                            </AppButton>
                                        </Tooltip>
                                    </div>
                                </TableCell>

                                {/* Refresh Data Column */}
                                <TableCell className="t-data" align="center">
                                    <div className="flex-container">
                                        <Checkbox
                                            checked={refreshColumnState.checked}
                                            indeterminate={refreshColumnState.indeterminate}
                                            onChange={(e) => handleBulkColumnToggle("refresh", e.target.checked)}
                                            disabled={disabled}
                                            className="table-checkbox"
                                            icon={<UncheckedIcon />}
                                            checkedIcon={<CheckedIcon />}
                                            indeterminateIcon={<IndeterminateIcon />}
                                        />
                                        <Typography className="table-head-title">
                                            Refresh Data
                                        </Typography>
                                    </div>
                                </TableCell>

                                {/* Action Allowed Column */}
                                <TableCell className="t-data">
                                    <div className="flex-container">
                                        <Checkbox
                                            checked={actionsColumnState.checked}
                                            indeterminate={actionsColumnState.indeterminate}
                                            onChange={(e) => handleBulkColumnToggle("actions", e.target.checked)}
                                            disabled={disabled}
                                            className="table-checkbox"
                                            icon={<UncheckedIcon />}
                                            checkedIcon={<CheckedIcon />}
                                            indeterminateIcon={<IndeterminateIcon />}
                                        />
                                        <Typography className="table-head-title">
                                            Action Allowed
                                        </Typography>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleModules.length > 0 ? (
                                visibleModules.map((module) => renderModuleTree(module, 0))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography >
                                            {searchText.trim()
                                                ? "No results found"
                                                : "No modules available"}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div>
    );
}