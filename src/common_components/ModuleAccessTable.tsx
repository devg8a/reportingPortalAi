import React, { useState, useMemo, useCallback } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    Switch,
    IconButton,
    Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

export interface Permission {
    read?: boolean;
    write?: boolean;
    create?: boolean;
    fullAccess?: boolean;
}

export interface PermissionsState {
    [moduleId: string]: Permission;
}

export interface Module {
    id: string;
    name: string;
    parentId?: string | null;
}

interface ModuleAccessTableProps {
    modules?: Module[];
    permissions?: PermissionsState;
    onChange?: (permissions: PermissionsState) => void;
}

export default function ModuleAccessTable({
    modules = [],
    permissions = {},
    onChange,
}: ModuleAccessTableProps) {
    const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});

    // Toggle module expansion
    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => ({
            ...prev,
            [moduleId]: !prev[moduleId],
        }));
    };

    // Get all children of a module (recursively)
    const getAllChildren = useCallback(
        (moduleId: string): Module[] => {
            const directChildren = modules.filter((m) => m.parentId === moduleId);
            let allChildren = [...directChildren];
            directChildren.forEach((child) => {
                allChildren = allChildren.concat(getAllChildren(child.id));
            });
            return allChildren;
        },
        [modules]
    );

    // Get all children of a module (direct only)
    const getChildren = useCallback(
        (moduleId: string): Module[] => {
            return modules.filter((m) => m.parentId === moduleId);
        },
        [modules]
    );

    // Handle permission change with all rules
    const handlePermissionChange = useCallback(
        (moduleId: string, permissionType: keyof Permission, newValue: boolean) => {
            const module = modules.find((m) => m.id === moduleId);
            if (!module) return;

            const updatedPermissions: PermissionsState = JSON.parse(JSON.stringify(permissions));

            // Initialize module permissions if not exists
            if (!updatedPermissions[moduleId]) {
                updatedPermissions[moduleId] = { ...permissions[moduleId] };
            }
            updatedPermissions[moduleId][permissionType] = newValue;

            // Apply rules based on permission type
            if (permissionType === "fullAccess") {
                if (newValue) {
                    // Full Access ON: Enable Read, Write, Create for parent and all children (recursively)
                    updatedPermissions[moduleId].read = true;
                    updatedPermissions[moduleId].write = true;
                    updatedPermissions[moduleId].create = true;
                    updatedPermissions[moduleId].fullAccess = true;

                    // Recursively set all children
                    const setAllChildren = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].read = true;
                            updatedPermissions[child.id].write = true;
                            updatedPermissions[child.id].create = true;
                            updatedPermissions[child.id].fullAccess = true;
                            setAllChildren(child.id);
                        });
                    };
                    setAllChildren(moduleId);
                } else {
                    // Full Access OFF: Turn off all permissions for parent and children (recursively)
                    updatedPermissions[moduleId].read = false;
                    updatedPermissions[moduleId].write = false;
                    updatedPermissions[moduleId].create = false;
                    updatedPermissions[moduleId].fullAccess = false;

                    // Recursively turn off all children
                    const turnOffAllChildren = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].read = false;
                            updatedPermissions[child.id].write = false;
                            updatedPermissions[child.id].create = false;
                            updatedPermissions[child.id].fullAccess = false;
                            turnOffAllChildren(child.id);
                        });
                    };
                    turnOffAllChildren(moduleId);
                }
            } else if (permissionType === "read") {
                if (newValue) {
                    // Read ON: Enable Read for all children (recursively)
                    const setChildrenRead = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].read = true;
                            setChildrenRead(child.id);
                        });
                    };
                    setChildrenRead(moduleId);
                } else {
                    // Read OFF: Turn off Read for children only (Write aur Create ko touch mat karo)
                    const turnOffChildren = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].read = false;
                            turnOffChildren(child.id);
                        });
                    };
                    turnOffChildren(moduleId);
                }
            } else if (permissionType === "write") {
                if (newValue) {
                    // Write ON: Enable Write for children only (Read ko auto-enable nahi)
                    const setChildrenWrite = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].write = true;
                            setChildrenWrite(child.id);
                        });
                    };
                    setChildrenWrite(moduleId);
                } else {
                    // Write OFF: Turn off Write for children only (Create ko touch mat karo - independently rahe)
                    const turnOffChildren = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].write = false;
                            // Create ko touch mat karo (independently rahe)
                            turnOffChildren(child.id);
                        });
                    };
                    turnOffChildren(moduleId);
                }
            } else if (permissionType === "create") {
                if (newValue) {
                    // Create ON: Enable Create for children only (Read+Write ko auto-enable nahi)
                    const setChildrenCreate = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].create = true;
                            setChildrenCreate(child.id);
                        });
                    };
                    setChildrenCreate(moduleId);
                } else {
                    // Create OFF: Turn off Create for children only
                    const turnOffChildren = (parentId: string) => {
                        const directChildren = modules.filter((m) => m.parentId === parentId);
                        directChildren.forEach((child) => {
                            if (!updatedPermissions[child.id]) {
                                updatedPermissions[child.id] = {};
                            }
                            updatedPermissions[child.id].create = false;
                            turnOffChildren(child.id);
                        });
                    };
                    turnOffChildren(moduleId);
                }
            }

            // Update parent permissions based on all children (Child → Parent Aggregation)
            const updateParentRecursively = (childModuleId: string) => {
                const childModule = modules.find((m) => m.id === childModuleId);
                if (!childModule || !childModule.parentId) return;

                const parentId = childModule.parentId;
                const siblings = modules.filter((m) => m.parentId === parentId);

                // Check if all siblings have each permission
                const allSiblingsRead = siblings.every((sibling) => {
                    const siblingPerms = updatedPermissions[sibling.id] || permissions[sibling.id] || {};
                    return siblingPerms?.read === true;
                });

                const allSiblingsWrite = siblings.every((sibling) => {
                    const siblingPerms = updatedPermissions[sibling.id] || permissions[sibling.id] || {};
                    return siblingPerms?.write === true;
                });

                const allSiblingsCreate = siblings.every((sibling) => {
                    const siblingPerms = updatedPermissions[sibling.id] || permissions[sibling.id] || {};
                    return siblingPerms?.create === true;
                });

                if (!updatedPermissions[parentId]) {
                    updatedPermissions[parentId] = { ...permissions[parentId] };
                }

                // Update parent permissions based on all children
                updatedPermissions[parentId].read = allSiblingsRead;
                updatedPermissions[parentId].write = allSiblingsWrite;
                updatedPermissions[parentId].create = allSiblingsCreate;

                // Update parent Full Access: ON only if parent has Read+Write+Create all ON
                // (Parent permissions already updated above based on children)
                const parentPerms = updatedPermissions[parentId];
                if (
                    parentPerms.read === true &&
                    parentPerms.write === true &&
                    parentPerms.create === true
                ) {
                    updatedPermissions[parentId].fullAccess = true;
                } else {
                    updatedPermissions[parentId].fullAccess = false;
                }

                // Recursively update grandparent
                updateParentRecursively(parentId);
            };

            // If this is a child module, update parent
            if (module.parentId) {
                updateParentRecursively(moduleId);
            }

            // Full Access Auto-Evaluation for current module
            // Full Access ON only if Read+Write+Create all are ON
            const modulePerms = updatedPermissions[moduleId];
            const allChildrenFull = getChildren(moduleId).every((child) => {
                const childPerms = updatedPermissions[child.id] || permissions[child.id] || {};
                // Check if children have Read+Write+Create all ON
                return (
                    childPerms?.read === true &&
                    childPerms?.write === true &&
                    childPerms?.create === true
                );
            });

            // Full Access ON only if Read+Write+Create all are ON
            if (
                modulePerms.read === true &&
                modulePerms.write === true &&
                modulePerms.create === true &&
                (getChildren(moduleId).length === 0 || allChildrenFull)
            ) {
                updatedPermissions[moduleId].fullAccess = true;
            } else {
                updatedPermissions[moduleId].fullAccess = false;
            }

            if (onChange) {
                onChange(updatedPermissions);
            }
        },
        [modules, permissions, getChildren, onChange]
    );

    // Get root modules (no parent)
    const rootModules = useMemo(() => {
        return modules.filter((m) => !m.parentId);
    }, [modules]);

    // Render module row
    const renderModuleRow = (module: Module, level = 0) => {
        const children = getChildren(module.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedModules[module.id];
        const modulePerms = permissions[module.id] || {};
        // Parent modules: either root level (parentId: null) or have children
        const isParent = !module.parentId || hasChildren;

        return (
            <React.Fragment key={module.id}>
                <TableRow
                    className="switch-style-container"
                    sx={{
                        "& > *": { borderBottom: "1px solid #e9eaeb" },
                        backgroundColor: "white",
                    }}
                >
                    <TableCell
                        sx={{
                            padding: "18px",
                            paddingLeft: level > 0 ? "33px" : "18px",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {hasChildren && (
                                <IconButton
                                    size="small"
                                    onClick={() => toggleModule(module.id)}
                                    sx={{ padding: 0 }}
                                >
                                    {isExpanded ? (
                                        <KeyboardArrowUpIcon sx={{ fontSize: "18px" }} />
                                    ) : (
                                        <KeyboardArrowDownIcon sx={{ fontSize: "18px" }} />
                                    )}
                                </IconButton>
                            )}
                            {!hasChildren && <Box sx={{ width: "28px" }} />}
                            <Typography
                                sx={{
                                    fontSize: "14px",
                                    fontWeight: isParent ? 600 : 400,
                                    color: "#27272a",
                                    lineHeight: "20px",
                                }}
                            >
                                {module.name}
                            </Typography>
                        </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ padding: "18px" }}>
                        <Switch
                            checked={modulePerms.fullAccess === true}
                            onChange={(e) => handlePermissionChange(module.id, "fullAccess", e.target.checked)}
                            sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "#14ae5c",
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: "#14ae5c",
                                },
                            }}
                        />
                    </TableCell>
                    <TableCell align="center" sx={{ padding: "18px" }}>
                        <Switch
                            checked={modulePerms.read === true}
                            onChange={(e) => handlePermissionChange(module.id, "read", e.target.checked)}
                            sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "#14ae5c",
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: "#14ae5c",
                                },
                            }}
                        />
                    </TableCell>
                    <TableCell align="center" sx={{ padding: "18px" }}>
                        <Switch
                            checked={modulePerms.write === true}
                            onChange={(e) => handlePermissionChange(module.id, "write", e.target.checked)}
                            sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "#14ae5c",
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: "#14ae5c",
                                },
                            }}
                        />
                    </TableCell>
                    <TableCell align="center" sx={{ padding: "18px" }}>
                        <Switch
                            checked={modulePerms.create === true}
                            onChange={(e) => handlePermissionChange(module.id, "create", e.target.checked)}
                            sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "#14ae5c",
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: "#14ae5c",
                                },
                            }}
                        />
                    </TableCell>
                </TableRow>
                {hasChildren && isExpanded && children.map((child) => renderModuleRow(child, level + 1))}
            </React.Fragment>
        );
    };

    return (
        <TableContainer
            component={Paper}
            sx={{
                border: "1px solid #f4f4f5",
                borderRadius: "8px",
                overflow: "hidden",
            }}
        >
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: "#f4f4f5" }}>
                        <TableCell sx={{ padding: "18px", borderBottom: "1px solid #e9eaeb" }}>
                            <Typography
                                sx={{
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#252b37",
                                    lineHeight: "18px",
                                }}
                            >
                                Module Access
                            </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "18px", borderBottom: "1px solid #e9eaeb" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                }}
                            >
                                <Checkbox
                                    checked={
                                        rootModules.length > 0 &&
                                        rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.fullAccess === true;
                                        })
                                    }
                                    indeterminate={
                                        rootModules.some((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.fullAccess === true;
                                        }) &&
                                        !rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.fullAccess === true;
                                        })
                                    }
                                    onChange={(e) => {
                                        const updatedPermissions = { ...permissions };
                                        const shouldEnable = e.target.checked;

                                        modules.forEach((module) => {
                                            if (!updatedPermissions[module.id]) {
                                                updatedPermissions[module.id] = {};
                                            }
                                            updatedPermissions[module.id].fullAccess = shouldEnable;
                                            updatedPermissions[module.id].read = shouldEnable;
                                            updatedPermissions[module.id].write = shouldEnable;
                                            updatedPermissions[module.id].create = shouldEnable;
                                        });

                                        if (onChange) {
                                            onChange(updatedPermissions);
                                        }
                                    }}
                                    sx={{
                                        padding: 0,
                                        color: "#d5d7da",
                                        "&.Mui-checked": { color: "#7f56d9" },
                                        "&.MuiCheckbox-indeterminate": { color: "#7f56d9" },
                                        "& .MuiSvgIcon-root": { fontSize: "16px" },
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#252b37",
                                        lineHeight: "18px",
                                    }}
                                >
                                    Full Access
                                </Typography>
                            </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "18px", borderBottom: "1px solid #e9eaeb" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                }}
                            >
                                <Checkbox
                                    checked={
                                        rootModules.length > 0 &&
                                        rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.read === true;
                                        })
                                    }
                                    indeterminate={
                                        rootModules.some((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.read === true;
                                        }) &&
                                        !rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.read === true;
                                        })
                                    }
                                    onChange={(e) => {
                                        const updatedPermissions = { ...permissions };
                                        const shouldEnable = e.target.checked;

                                        // Update Read for all modules
                                        modules.forEach((module) => {
                                            if (!updatedPermissions[module.id]) {
                                                updatedPermissions[module.id] = {};
                                            }
                                            updatedPermissions[module.id].read = shouldEnable;
                                        });

                                        // After updating Read, trigger Full Access evaluation for each module
                                        modules.forEach((module) => {
                                            const modulePerms = updatedPermissions[module.id];
                                            const children = modules.filter((m) => m.parentId === module.id);
                                            const allChildrenFull = children.every((child) => {
                                                const childPerms = updatedPermissions[child.id] || {};
                                                return (
                                                    childPerms?.read === true &&
                                                    childPerms?.write === true &&
                                                    childPerms?.create === true
                                                );
                                            });

                                            // Full Access ON only if Read+Write+Create all are ON
                                            if (
                                                modulePerms.read === true &&
                                                modulePerms.write === true &&
                                                modulePerms.create === true &&
                                                (children.length === 0 || allChildrenFull)
                                            ) {
                                                updatedPermissions[module.id].fullAccess = true;
                                            } else {
                                                updatedPermissions[module.id].fullAccess = false;
                                            }
                                        });

                                        if (onChange) {
                                            onChange(updatedPermissions);
                                        }
                                    }}
                                    sx={{
                                        padding: 0,
                                        color: "#d5d7da",
                                        "&.Mui-checked": { color: "#7f56d9" },
                                        "&.MuiCheckbox-indeterminate": { color: "#7f56d9" },
                                        "& .MuiSvgIcon-root": { fontSize: "16px" },
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#252b37",
                                        lineHeight: "18px",
                                    }}
                                >
                                    Read
                                </Typography>
                            </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "18px", borderBottom: "1px solid #e9eaeb" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                }}
                            >
                                <Checkbox
                                    checked={
                                        rootModules.length > 0 &&
                                        rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.write === true;
                                        })
                                    }
                                    indeterminate={
                                        rootModules.some((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.write === true;
                                        }) &&
                                        !rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.write === true;
                                        })
                                    }
                                    onChange={(e) => {
                                        const updatedPermissions = { ...permissions };
                                        const shouldEnable = e.target.checked;

                                        // Update Write for all modules
                                        modules.forEach((module) => {
                                            if (!updatedPermissions[module.id]) {
                                                updatedPermissions[module.id] = {};
                                            }
                                            updatedPermissions[module.id].write = shouldEnable;
                                        });

                                        // After updating Write, trigger Full Access evaluation for each module
                                        modules.forEach((module) => {
                                            const modulePerms = updatedPermissions[module.id];
                                            const children = modules.filter((m) => m.parentId === module.id);
                                            const allChildrenFull = children.every((child) => {
                                                const childPerms = updatedPermissions[child.id] || {};
                                                return (
                                                    childPerms?.read === true &&
                                                    childPerms?.write === true &&
                                                    childPerms?.create === true
                                                );
                                            });

                                            // Full Access ON only if Read+Write+Create all are ON
                                            if (
                                                modulePerms.read === true &&
                                                modulePerms.write === true &&
                                                modulePerms.create === true &&
                                                (children.length === 0 || allChildrenFull)
                                            ) {
                                                updatedPermissions[module.id].fullAccess = true;
                                            } else {
                                                updatedPermissions[module.id].fullAccess = false;
                                            }
                                        });

                                        if (onChange) {
                                            onChange(updatedPermissions);
                                        }
                                    }}
                                    sx={{
                                        padding: 0,
                                        color: "#d5d7da",
                                        "&.Mui-checked": { color: "#7f56d9" },
                                        "&.MuiCheckbox-indeterminate": { color: "#7f56d9" },
                                        "& .MuiSvgIcon-root": { fontSize: "16px" },
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#252b37",
                                        lineHeight: "18px",
                                    }}
                                >
                                    Write
                                </Typography>
                            </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "18px", borderBottom: "1px solid #e9eaeb" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                }}
                            >
                                <Checkbox
                                    checked={
                                        rootModules.length > 0 &&
                                        rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.create === true;
                                        })
                                    }
                                    indeterminate={
                                        rootModules.some((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.create === true;
                                        }) &&
                                        !rootModules.every((m) => {
                                            const perms = permissions[m.id] || {};
                                            return perms.create === true;
                                        })
                                    }
                                    onChange={(e) => {
                                        const updatedPermissions = { ...permissions };
                                        const shouldEnable = e.target.checked;

                                        // Update Create for all modules
                                        modules.forEach((module) => {
                                            if (!updatedPermissions[module.id]) {
                                                updatedPermissions[module.id] = {};
                                            }
                                            updatedPermissions[module.id].create = shouldEnable;
                                        });

                                        // After updating Create, trigger Full Access evaluation for each module
                                        modules.forEach((module) => {
                                            const modulePerms = updatedPermissions[module.id];
                                            const children = modules.filter((m) => m.parentId === module.id);
                                            const allChildrenFull = children.every((child) => {
                                                const childPerms = updatedPermissions[child.id] || {};
                                                return (
                                                    childPerms?.read === true &&
                                                    childPerms?.write === true &&
                                                    childPerms?.create === true
                                                );
                                            });

                                            // Full Access ON only if Read+Write+Create all are ON
                                            if (
                                                modulePerms.read === true &&
                                                modulePerms.write === true &&
                                                modulePerms.create === true &&
                                                (children.length === 0 || allChildrenFull)
                                            ) {
                                                updatedPermissions[module.id].fullAccess = true;
                                            } else {
                                                updatedPermissions[module.id].fullAccess = false;
                                            }
                                        });

                                        if (onChange) {
                                            onChange(updatedPermissions);
                                        }
                                    }}
                                    sx={{
                                        padding: 0,
                                        color: "#d5d7da",
                                        "&.Mui-checked": { color: "#7f56d9" },
                                        "&.MuiCheckbox-indeterminate": { color: "#7f56d9" },
                                        "& .MuiSvgIcon-root": { fontSize: "16px" },
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#252b37",
                                        lineHeight: "18px",
                                    }}
                                >
                                    Create
                                </Typography>
                            </Box>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>{rootModules.map((module) => renderModuleRow(module, 0))}</TableBody>
            </Table>
        </TableContainer>
    );
}
