import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Divider,
    CircularProgress,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AllPermissions, { ModuleData } from "./AllPermissions";
import { ModulePermission } from "../redux/permissionsSlice";
import useToast from "./Toast/useToast";
import { ApiCall } from "../helper/axios";
import { useSelector } from "react-redux";
import { selectToken } from "../redux/authSlice";
import { selectModules } from "../redux/userDataSlice";
import { useFormik } from "formik";
import * as Yup from "yup";
import NameInput from "./NameInput";
import CustomLoader from "./CustomLoader";
import PageContainer from "./PageContainer";
import { ROUTES } from "../routes/routes.constants";
import AppButton from "../common_components/AppButton";
import CommonLoader from "./CommonLoader";

const getValidationSchema = () => {
    return Yup.object({
        name: Yup.string()
            .trim()
            .required("Role name is required"),

    });
};

/**
 * Page component for creating and editing roles
 * Matches Figma design with all required features
 */
export default function CreateRoleModal() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = !!id;
    const [permissions, setPermissions] = useState<{ [moduleKey: string]: ModulePermission }>({});
    const [loading, setLoading] = useState(false);
    const [fetchingRole, setFetchingRole] = useState(false);
    const [initialRoleName, setInitialRoleName] = useState("");
    const [initialDescription, setInitialDescription] = useState("");
    const toast = useToast();
    const token = useSelector(selectToken);
    const modulesFromRedux = useSelector(selectModules);
    
    // Convert Redux modules to ModuleData format
    const modules: ModuleData[] = React.useMemo(() => {
        if (!modulesFromRedux || modulesFromRedux.length === 0) {
            console.log("CreateRoleModal - No modules in Redux");
            return [];
        }
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

        return (modulesFromRedux || []).map((m: any) => convertModule(m));
    }, [modulesFromRedux]);

    const formik = useFormik({
        initialValues: {
            name: initialRoleName || '',
            description: initialDescription || '',
        },
        enableReinitialize: true,
        validationSchema: getValidationSchema(),
        onSubmit: async (values) => {
            setLoading(true);

            try {
                // Transform permissions to API format
                // Always include ALL modules with ALL required keys and default values
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

                const payload = {
                    name: values.name.trim(),
                    description: values.description.trim(),
                    permissions: apiPermissions,
                };

                console.log('Final payload:', payload);

                const response = await ApiCall(
                    isEditMode ? "PUT" : "POST",
                    isEditMode ? `/api/roles/${id}` : "/api/roles/add-role",
                    payload,
                    {
                        Authorization: token || "",
                    }
                );
                console.log(response, "response");
                
                // Check if response is successful
                if (response && "data" in response && response?.data?.success) {
                    const responseData = (response as any)?.data;
                    if (responseData?.success !== false) {
                        toast.success(
                            isEditMode 
                                ? (responseData?.message || "Role updated successfully")
                                : (responseData?.message || "Role created successfully")
                        );
                        formik.resetForm();
                        setPermissions({});
                        navigate(ROUTES.rolesPermission.path);
                    } else {
                        const errorMessage = responseData?.message || (isEditMode ? "Failed to update role" : "Failed to create role");
                        toast.error(errorMessage);
                    }
                } else {
                    const errorMessage =
                        (response as any)?.response?.data?.message ||
                        (response as any)?.data?.message ||
                        (isEditMode ? "Failed to update role" : "Failed to create role");
                    toast.error(errorMessage);
                }
            } catch (error: any) {
                const errorMessage =
                    error?.response?.data?.message || error?.message || "An error occurred while creating the role";
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
    });

    // Fetch role data if in edit mode
    useEffect(() => {
        const fetchRoleData = async () => {
            if (isEditMode && id && token) {
                try {
                    setFetchingRole(true);
                    const response = await ApiCall("GET", `/api/roles/${id}`, "", { Authorization: token });
                    
                    if (response && "status" in response && response.status === 200) {
                        const roleData = (response as any)?.data?.data;
                        
                        // Set initial form values
                        setInitialRoleName(roleData.name || "");
                        setInitialDescription(roleData.description || "");
                        
                        // Transform permissions to ModulePermission format
                        const transformedPermissions: { [moduleKey: string]: ModulePermission } = {};
                        if (roleData.permissions) {
                            Object.keys(roleData.permissions).forEach((moduleKey) => {
                                const perm = roleData.permissions[moduleKey];
                                transformedPermissions[moduleKey] = {
                                    access: perm.access || false,
                                    actions: perm.actions || [],
                                    client_scope: perm.client_scope || "assigned",
                                    refresh: perm.refresh || false,
                                };
                            });
                        }
                        setPermissions(transformedPermissions);
                        
                        // Reset form with fetched data
                        formik.resetForm({
                            values: {
                                name: roleData.name || '',
                                description: roleData.description || '',
                            },
                        });
                    } else {
                        const errorMessage = (response as any)?.response?.data?.message || (response as any)?.data?.message;
                        toast.error(errorMessage || "Failed to fetch role details");
                        navigate(ROUTES.rolesPermission.path);
                    }
                } catch (error: any) {
                    console.error("Error fetching role:", error);
                    toast.error("Failed to fetch role details");
                    navigate(ROUTES.rolesPermission.path);
                } finally {
                    setFetchingRole(false);
                }
            } else if (!isEditMode && modules.length > 0) {
                // Initialize permissions from module data for create mode
                const initialPerms: { [moduleKey: string]: ModulePermission } = {};
                // Recursively process modules to initialize permissions
                const processModules = (moduleList: ModuleData[]) => {
                    moduleList.forEach((module) => {
                        // Only process child modules (not parents) that have permissions from API
                        if (!module.is_parent && module.permissions !== undefined && module.permissions !== null) {
                            const modulePerms = module.permissions;
                            // Initialize permissions from API data
                            initialPerms[module.key] = {
                                access: modulePerms.access || false,
                                // Don't pre-select actions - user will select manually
                                actions: [],
                                client_scope: modulePerms.client_scope || "assigned",
                                refresh: modulePerms.refresh || false,
                            };
                        }
                        // Process sub_modules recursively
                        if (module.sub_module && module.sub_module.length > 0) {
                            processModules(module.sub_module);
                        }
                    });
                };

                processModules(modules);
                setPermissions(initialPerms);
            }
        };
            fetchRoleData();
    }, [isEditMode, id, token, modules]);

    // Handle save - trigger Formik submit
    const handleSave = () => {
        formik.handleSubmit();
    };

    // Handle discard - revert changes and navigate back
    const handleDiscard = () => {
        if (isEditMode) {
            formik.resetForm({
                values: {
                    name: initialRoleName || '',
                    description: initialDescription || '',
                },
            });
            // Reset permissions to initial state if needed
            // This will be handled by the fetchRoleData effect
        } else {
            formik.resetForm({
                values: {
                    name: '',
                    description: '',
                },
            });
            setPermissions({});
        }
        navigate(ROUTES.rolesPermission.path);
    };

    const handleChange = (name: string, e: any) => {
        const value = e?.target?.value || '';
        formik.setFieldValue(name, value);
    };

    const handleBlur = (name: string) => {
        formik.setFieldTouched(name, true);
    };

    if (fetchingRole) {
        return (
            <PageContainer>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 'calc(100vh - 200px)',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                    }}
                >
                    <CommonLoader className='table-loader' />
                    {/* <CircularProgress sx={{ color: '#d10075' }} /> */}
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <div className="create-page-role-permission">
                <div className="page-flex-container">

                {/* Header with buttons at top */}
                <div className="page-header">
                    <Typography className="page-header-title">
                        {isEditMode ? "Edit Role Details" : "Add Role Details"}
                    </Typography>
                    <div className="group-button">
                        <AppButton variant="outlined" color="primary" className="app-common-discard" onClick={handleDiscard} disabled={loading}>
                            Discard
                        </AppButton>
                        <AppButton color="primary" className="app-common-button" variant="outlined" onClick={handleSave} disabled={loading}>
                            {loading ? <CustomLoader sx={{ color: 'white' }} size={18} /> : "Save Changes"}
                        </AppButton>
                    </div>

                    
                </div>
                
                    {/* Role Name and Description Fields */}
                    <div className="page-header-form">
                        <div className="role-page-header-form-group">
                            {/* Role Name Field */}
                            <div className="form-control">
                                <NameInput
                                    label='Role name' type='text' required
                                    value={formik.values.name}
                                    placeholder={'Enter your role name'}
                                    onChange={(e) => handleChange('name', e)}
                                    onBlur={(value) => handleBlur('name')}
                                    autoComplete='off'
                                    errors={typeof formik.errors.name === 'string' ? formik.errors.name : undefined}
                                    touched={typeof formik.touched.name === 'boolean' ? formik.touched.name : false}
                                />
                            </div>

                            {/* Description Field */}
                            <div className="form-control">
                                <NameInput
                                    label='Description' type='text'
                                    value={formik.values.description}
                                    placeholder={'Enter your description'}
                                    onChange={(e) => handleChange('description', e)}
                                    autoComplete='off'
                                    errors={undefined}
                                    touched={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Content */}
                <div className="role-permission-page-content-body">
                    {/* All Permissions Component */}
                        <AllPermissions
                            modules={modules}
                            permissions={permissions}
                            onChange={setPermissions}
                            disabled={loading}
                        />
                </div>
            </div>
        </PageContainer>
    );
}
