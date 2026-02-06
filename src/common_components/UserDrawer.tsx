import React, { useEffect, useState } from "react";
import { useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CustomLoader from "./CustomLoader";
import EmailInput from "./EmailInput";
import PasswordInput from "./PasswordInput";
import SelectInput from "./SelectInput";
import RoleSelectInput from "./RoleSelectInput";
import MultiSelectInput from "./MultiSelectInput";
import OverrideRoleDrawer from "./OverrideRoleDrawer";
import ValidationMessage from "./Validation";
import { emailRegex } from "../helper/regex";
import { ModulePermission } from "../redux/permissionsSlice";
import "../App.css";
import NameInput from "./NameInput";
import AppButton from "./AppButton";
import { getCurrentUserId } from "../helper/commonFunctions";
import ConfirmActionModal from "./ConfirmActionModal";
import { ApiCall } from "../helper/axios";
import { selectToken } from "../redux/authSlice";
import { useSelector } from "react-redux";

const drawerWidth = 600;

// Transform user permissions from API format to ModulePermission format
// API format: { "active_client_list": { access, actions, client_scope, refresh }, ... }
// ModulePermission format: { "active_client_list": { access, actions, client_scope, refresh }, ... }
const transformUserPermissions = (userPermissions: { [key: string]: any }): { [moduleKey: string]: ModulePermission } => {
    const transformed: { [moduleKey: string]: ModulePermission } = {};

    Object.keys(userPermissions).forEach((moduleKey) => {
        const perm = userPermissions[moduleKey];
        transformed[moduleKey] = {
            access: perm.access !== undefined ? perm.access : false,
            actions: Array.isArray(perm.actions) ? perm.actions : [],
            client_scope: perm.client_scope || "assigned",
            refresh: perm.refresh !== undefined ? perm.refresh : false,
        };
    });

    return transformed;
};

// Transform user overrides from API format to ModulePermission format
const transformUserOverrides = (userOverrides: { [key: string]: any }): { [moduleKey: string]: ModulePermission } => {
    const transformed: { [moduleKey: string]: ModulePermission } = {};

    Object.keys(userOverrides).forEach((moduleKey) => {
        const override = userOverrides[moduleKey];
        transformed[moduleKey] = {
            access: override.access !== undefined ? override.access : false,
            actions: Array.isArray(override.actions) ? override.actions : [],
            client_scope: override.client_scope || "assigned",
            refresh: override.refresh !== undefined ? override.refresh : false,
        };
    });

    return transformed;
};

const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" }
];

const locationOptions = [
    { value: "US", label: "USA" },
    { value: "IN", label: "India" }
];

const twoFactorAuth = [
    { value: "true", label: 'ON' },
    { value: "false", label: 'OFF' }
]


// Validation schema using Yup
const getValidationSchema = (isEditMode: boolean) => {
    return Yup.object({
        firstName: Yup.string()
            .trim()
            .required(ValidationMessage.firstNameRequired),
        lastName: Yup.string()
            .trim()
            .required(ValidationMessage.lastNameRequired),
        email: Yup.string()
            .trim()
            .required(ValidationMessage.emailRequired)
            .matches(emailRegex, ValidationMessage.emailInvalid)
            .email(ValidationMessage.emailInvalid),
        newPassword: isEditMode
            ? Yup.string()
                .nullable()
                .notRequired()
                .test(
                    "password-rules",
                    "Password must contain uppercase, lowercase, number and special character",
                    (value) => {
                        if (!value) return true;

                        return (
                            /[A-Z]/.test(value) &&
                            /[a-z]/.test(value) &&
                            /[0-9]/.test(value) &&
                            /[@$!%*?&#]/.test(value)
                        );
                    }
                )
            : Yup.string()
                .trim()
                .required(ValidationMessage.passwordRequired)
                .matches(/[A-Z]/, "Must contain at least one uppercase letter")
                .matches(/[a-z]/, "Must contain at least one lowercase letter")
                .matches(/[0-9]/, "Must contain at least one number")
                .matches(
                    /[@$!%*?&#]/,
                    "Must contain at least one special character (@, $, !, %, *, ?, &, #)"
                ),

        confirmPassword: isEditMode
            ? Yup.string()
                .nullable()
                .oneOf([Yup.ref("newPassword"), null], "Passwords must match")
            : Yup.string()
                .trim()
                .required("Confirm Password is required")
                .oneOf([Yup.ref("newPassword")], "Passwords must match"),
        role: Yup.string()
            .required(ValidationMessage.roleRequired),
        user_type: Yup.string()
            .required(ValidationMessage.designationRequired),
        status: Yup.string()
            .required(ValidationMessage.statusRequired),
        two_step_enabled: Yup.string()
            .required(ValidationMessage.two_factor_authentication),
        location: Yup.string()
            .required(ValidationMessage.locationRequired),
        employeePortfolio: Yup.array()
            .optional(),
        avatar: Yup.mixed()
            .nullable()
            .test(
                "fileSize",
                "File size is too large",
                (file: any) => typeof file === "string" ? true : !file || file.size <= 7 * 1024 * 1024
            )
            .test(
                "fileType",
                "File type must be .jpeg, .jpg, .gif, .webp and .png",
                (file: any) => typeof file === "string" ? true : !file || ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', "image/webp"].includes(file.type)
            ),
    });
};

interface UserDrawerProps {
    open: boolean;
    onClose: () => void;
    userData?: any;
    onSave: (values: any) => Promise<boolean | void>;
    roleOptions?: Array<{ value: string; label: string; permissions?: any; }>;
    employeePortfolioOptions?: Array<{ value: string; label: string }>;
    designationOptions?: Array<{ value: string; label: string }>;
    onOverrideSave?: (overrides: { [moduleKey: string]: any }) => void; // Callback when override is saved
}

function UserDrawer({
    open,
    onClose,
    userData = null,
    onSave,
    roleOptions = [],
    employeePortfolioOptions = [],
    designationOptions = [],
    onOverrideSave
}: UserDrawerProps) {
    const isEditMode = !!userData;
    const [avatarInitials, setAvatarInitials] = useState<string | ArrayBuffer | null>(null);
    const [overrideDrawerOpen, setOverrideDrawerOpen] = useState(false);
    const [hasOverrides, setHasOverrides] = useState(false); // Track if user has overrides
    const [previousRole, setPreviousRole] = useState<string | null>(null);
    const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
    const [pendingRole, setPendingRole] = useState<string | null>(null);
    const token = useSelector(selectToken);

    const getRolePermissionsById = (roleId: string) => {
        const role = roleOptions.find(r => r.value === roleId);
        return role?.permissions || {};
    };


    // Get role name from role ID
    const getRoleName = (roleId: string): string => {
        if (!roleId) return "";

        // Priority 1: Check if userData has role name (edit mode)
        // This handles case when userData.role.name exists
        if (isEditMode && userData?.role?.name) {
            return userData.role.name;
        }

        // Priority 2: Find from roleOptions (works for both add and edit mode)
        const roleOption = roleOptions.find(option => option.value === roleId);
        if (roleOption?.label) {
            return roleOption.label;
        }

        // Fallback: return empty string
        return "";
    };

    // Check if user has overrides when userData changes
    useEffect(() => {
        if (userData) {
            const overrides = userData?.overrides || {};
            const hasOverridesData = Object.keys(overrides).length > 0;
            setHasOverrides(hasOverridesData);
        } else {
            setHasOverrides(false);
        }
    }, [userData]);

    useEffect(() => {
        if (isEditMode && userData) {
            setPreviousRole(userData.role_id);
        }
    }, [userData, isEditMode]);

    const formik = useFormik({
        initialValues: {
            firstName: userData?.first_name || "",
            lastName: userData?.last_name || "",
            email: userData?.email || "",
            newPassword: "",
            confirmPassword: "",
            // Store role id in formik; show label via roleOptions
            role: userData?.role_id || "",
            user_type: userData?.user_type || "",
            status: userData?.status || "Active",
            two_step_enabled: userData?.two_step_enabled || userData?.two_step_enabled === false ? JSON.stringify(userData?.two_step_enabled) : "",
            location: userData?.location || "",
            employeePortfolio: Array.isArray(userData?.employee_portfolio)
                ? userData.employee_portfolio.map((u: any) => u._id)
                : [],
            avatar: userData?.profile_pic || null,
        },
        enableReinitialize: true,
        validationSchema: getValidationSchema(isEditMode),
        onSubmit: async (values, { resetForm, setSubmitting }) => {
            try {
                if (onSave) {
                    const ok = await onSave(values);
                    // On create success: reset form but keep drawer open (as requested)
                    if (ok && !isEditMode) {
                        resetForm();
                        setAvatarInitials(null);
                    }
                }
            } catch (e) {
                console.log('save user error', e);
            } finally {
                setSubmitting(false);
            }
        },
    });

    const handleChange = (name: string, e: any) => {
        const value = e?.target?.value || '';
        console.log('value', e);

        formik.setFieldValue(name, value);
    };

    const handleBlur = (name: string) => {
        formik.setFieldTouched(name, true);
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, setFieldError: (field: string, message: string) => void) => {
        const reader = new FileReader(),
            files = e.target.files
        if (files && files.length > 0) {
            const file = files[0];
            const fileSizeMB = file.size / (1024 * 1024);
            const fileType = file.type.split('/')[0];


            const maxSize = 7;

            if (fileSizeMB > maxSize) {
                setFieldError('avatar', `File size exceeds the limit of ${maxSize} MB for ${fileType} files.`);
                return;
            }

            reader.onload = async function ({ target }) {
                setAvatarInitials(target?.result || null)
                formik.setFieldValue('avatar', files[0])
            }
            reader.readAsDataURL(files[0])
        }
    }

    const getAvatarSrc = (avatar: any): string | undefined => {
        if (!avatar) return undefined;

        // API se aayi base64 / url string
        if (typeof avatar === "string") {
            return avatar;
        }

        // New upload (File)
        if (avatar instanceof File) {
            return URL.createObjectURL(avatar);
        }

        return undefined;
    };

    const handleRoleChange = (name: string, e: any) => {
        const newRoleId = e.target.value;

        if (hasOverrides && isEditMode && newRoleId !== formik.values.role) {
            setPendingRole(newRoleId);
            setShowRoleChangeModal(true);
            return;
        }

        formik.setFieldValue(name, newRoleId);

        const newRolePermissions = getRolePermissionsById(newRoleId);

        if (userData) {
            userData.permissions = newRolePermissions;
            userData.overrides = {};
        }

        setHasOverrides(false);
        if (onOverrideSave) {
            onOverrideSave({});
        }
    };

    return (
        <>
            <Drawer
                anchor="right"
                className="user-list-edit"
                open={open}
                onClose={onClose}
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
            >
                <FormikProvider value={formik}>
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
                                    {isEditMode ? "Edit User" : "Add New User"}
                                </Typography>
                            </Box>
                            <AppButton
                                variant="contained"
                                onClick={() => formik.handleSubmit()}
                                startIcon={<SaveIcon />}
                                disabled={formik.isSubmitting}
                                color="primary"
                                className="app-common-button"
                            >
                                {formik.isSubmitting ? <CustomLoader sx={{ color: 'white' }} size={18} /> : 'Save'}
                            </AppButton>
                        </Box>

                        {/* Content */}
                        <Box
                            className="form-input-root gap-responsive"
                            component="form"
                            onSubmit={formik.handleSubmit}
                            sx={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px'
                            }}
                        >
                            {/* Basic Information Section */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <Typography
                                        sx={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: '#ff008e',
                                            lineHeight: '28px'
                                        }}
                                        className="field-drawer-title"
                                    >
                                        Basic Information
                                    </Typography>
                                    <Box sx={{ height: '1px', backgroundColor: '#e9eaeb', width: '100%' }} />
                                </Box>

                                {/* Avatar Section */}
                                <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        id="avatar-upload"
                                        onChange={(e) => handleAvatarUpload(e, formik.setFieldError)}
                                    />

                                    <Avatar
                                        sx={{ width: 96, height: 96, fontSize: "36px", fontWeight: 500 }}
                                        src={getAvatarSrc(formik.values.avatar)}
                                    >
                                        {!formik.values.avatar && typeof avatarInitials === 'string' ? avatarInitials : null}
                                    </Avatar>


                                    <Button
                                        variant="outlined"
                                        component="label"
                                        htmlFor="avatar-upload"
                                        startIcon={<EditIcon />}
                                        className="add-edit-avatar-btn"

                                    >{isEditMode ? "Edit Avatar" : "Add Avatar"}</Button>

                                </Box>
                                {formik.errors.avatar && (
                                    <Typography sx={{ color: "red", fontSize: "12px", mt: 1 }}>
                                        {formik.errors.avatar as string}
                                    </Typography>
                                )}


                                {/* First Name and Last Name */}
                                <Box sx={{ display: 'flex', gap: '20px' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <NameInput
                                            label='First Name' type='text' required
                                            value={formik.values.firstName}
                                            placeholder={'Enter your First Name'}
                                            onChange={(e) => handleChange('firstName', e)}
                                            onBlur={(value) => handleBlur('firstName')}
                                            autoComplete='off'
                                            errors={typeof formik.errors.firstName === 'string' ? formik.errors.firstName : undefined}
                                            touched={typeof formik.touched.firstName === 'boolean' ? formik.touched.firstName : false}
                                        />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <NameInput
                                            placeholder={'Enter your Last Name'}
                                            label='Last Name' type='text' required
                                            value={formik.values.lastName}
                                            onChange={(e) => handleChange('lastName', e)}
                                            onBlur={(value) => handleBlur('lastName')}
                                            autoComplete='off'
                                            errors={typeof formik.errors.lastName === 'string' ? formik.errors.lastName : undefined}
                                            touched={typeof formik.touched.lastName === 'boolean' ? formik.touched.lastName : false}
                                        />
                                    </Box>
                                </Box>

                                {/* Email and Role */}
                                <Box sx={{ display: 'flex', gap: '20px' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <EmailInput
                                            label="Email Address"
                                            placeholder="Enter email address"
                                            type="email"
                                            value={formik.values.email}
                                            onChange={(e) => handleChange('email', e)}
                                            onBlur={(e) => handleBlur('email')}
                                            autoComplete="off"
                                            errors={typeof formik.errors.email === 'string' ? formik.errors.email : undefined}
                                            touched={typeof formik.touched.email === 'boolean' ? formik.touched.email : false}
                                            maxLength={50}
                                        />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <RoleSelectInput
                                            label="Role"
                                            name="role"
                                            value={formik.values.role}
                                            onChange={(e) => handleRoleChange('role', e)}
                                            onBlur={(e) => handleBlur('role')}
                                            errors={typeof formik.errors.role === 'string' ? formik.errors.role : undefined}
                                            touched={typeof formik.touched.role === 'boolean' ? formik.touched.role : false}
                                            options={roleOptions}
                                            placeholder="Select Role"
                                            required
                                            onOverrideClick={() => setOverrideDrawerOpen(true)}
                                            overRideShowStatus={isEditMode}
                                            hasOverrides={hasOverrides}
                                        />
                                    </Box>
                                </Box>
                            </Box>

                            {/* Security Section */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <Typography
                                        sx={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: '#ff008e',
                                            lineHeight: '28px'
                                        }}
                                        className="field-drawer-title"
                                    >
                                        Security
                                    </Typography>
                                    <Box sx={{ height: '1px', backgroundColor: '#e9eaeb', width: '100%' }} />
                                </Box>

                                <Box sx={{ width: '100%' }} className='password-container'>
                                    {/* Password Input */}
                                    <PasswordInput
                                        label="New Password"
                                        Placeholder='Enter New Password'
                                        value={formik.values.newPassword}
                                        errors={typeof formik.errors.newPassword === 'string' ? formik.errors.newPassword : undefined}
                                        touched={typeof formik.touched.newPassword === 'boolean' ? formik.touched.newPassword : false}
                                        name="newPassword"
                                        onChange={(e) => handleChange('newPassword', e)}
                                        onBlur={(e) => handleBlur('newPassword')}
                                        type='password'
                                    />
                                </Box>
                                {!isEditMode && <Box sx={{ width: '100%' }} className='password-container'>
                                    {/* Password Input */}
                                    <PasswordInput
                                        label="Confirmed Password"
                                        Placeholder='Enter Confirmed Password'
                                        value={formik.values.confirmPassword}
                                        errors={typeof formik.errors.confirmPassword === 'string' ? formik.errors.confirmPassword : undefined}
                                        touched={typeof formik.touched.confirmPassword === 'boolean' ? formik.touched.confirmPassword : false}
                                        name="confirmPassword"
                                        onChange={(e) => handleChange('confirmPassword', e)}
                                        onBlur={(e) => handleBlur('confirmPassword')}
                                        type='password'
                                    />
                                </Box>}
                            </Box>

                            {/* Other Section */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <Typography
                                        sx={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: '#ff008e',
                                            lineHeight: '28px'
                                        }}
                                        className="field-drawer-title"
                                    >
                                        Other
                                    </Typography>
                                    <Box sx={{ height: '1px', backgroundColor: '#e9eaeb', width: '100%' }} />
                                </Box>

                                {/* Designation and Status */}
                                <Box sx={{ display: 'flex', gap: '20px' }}>
                                    <Box sx={{ flex: 1 }}>
                                        <SelectInput
                                            label="Designation"
                                            name="user_type"
                                            value={formik.values.user_type}
                                            onChange={(e) => handleChange('user_type', e)}
                                            onBlur={(e) => handleBlur('user_type')}
                                            errors={typeof formik.errors.user_type === 'string' ? formik.errors.user_type : undefined}
                                            touched={typeof formik.touched.user_type === 'boolean' ? formik.touched.user_type : false}
                                            options={designationOptions}
                                            placeholder="Select Designation"
                                            required
                                        />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <SelectInput
                                            label="Location"
                                            name="location"
                                            value={formik.values.location}
                                            onChange={(e) => handleChange('location', e)}
                                            onBlur={(e) => handleBlur('location')}
                                            errors={typeof formik.errors.location === 'string' ? formik.errors.location : undefined}
                                            touched={typeof formik.touched.location === 'boolean' ? formik.touched.location : false}
                                            options={locationOptions}
                                            placeholder="Select Location"
                                            required
                                        />
                                    </Box>
                                </Box>

                                {/* Report Access Type and Location */}
                                <Box sx={{ display: 'flex', gap: '20px' }}>
                                    <Box sx={{ flex: 1 }}>
                                        {(() => {
                                            const currentUserId = getCurrentUserId();
                                            const editingUserId = userData?.id || userData?._id;
                                            const isSelf = isEditMode && currentUserId && currentUserId === editingUserId;

                                            // Filter out "Inactive" option if user is editing themselves
                                            const filteredStatusOptions = isSelf
                                                ? statusOptions.filter(opt => opt.value === "Active")
                                                : statusOptions;

                                            return (
                                                <SelectInput
                                                    label="Status"
                                                    name="status"
                                                    value={formik.values.status}
                                                    onChange={(e) => handleChange('status', e)}
                                                    onBlur={(e) => handleBlur('status')}
                                                    errors={typeof formik.errors.status === 'string' ? formik.errors.status : undefined}
                                                    touched={typeof formik.touched.status === 'boolean' ? formik.touched.status : false}
                                                    options={filteredStatusOptions}
                                                    placeholder="Select Status"
                                                    required
                                                />
                                            );
                                        })()}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <SelectInput
                                            label="Two-Factor Authentication (2FA)"
                                            name="2FA"
                                            value={formik.values.two_step_enabled}
                                            onChange={(e) => formik.setFieldValue('two_step_enabled', e?.target?.value)}
                                            onBlur={(e) => handleBlur('two_step_enabled')}
                                            errors={typeof formik.errors.two_step_enabled === 'string' ? formik.errors.two_step_enabled : undefined}
                                            touched={typeof formik.touched.two_step_enabled === 'boolean' ? formik.touched.two_step_enabled : false}
                                            options={twoFactorAuth}
                                            placeholder="Choose your 2FA method"
                                            required
                                        />
                                    </Box>
                                </Box>

                                {/* Employee Portfolio (Multi-select) */}
                                <div className="selected-list-tags">
                                    <MultiSelectInput
                                        label="Employee Portfolio"
                                        name="employeePortfolio"
                                        value={formik.values.employeePortfolio}
                                        onChange={(e) => handleChange('employeePortfolio', e)}
                                        onBlur={(e) => handleBlur('employeePortfolio')}
                                        errors={typeof formik.errors.employeePortfolio === 'string' ? formik.errors.employeePortfolio : undefined}
                                        touched={typeof formik.touched.employeePortfolio === 'boolean' ? formik.touched.employeePortfolio : false}
                                        options={employeePortfolioOptions}
                                        placeholder="Select Employee Portfolio"
                                        maxDisplay={3}
                                    />
                                </div>
                            </Box>
                        </Box>
                    </Box>
                </FormikProvider>
            </Drawer>

            {/* Override Role Drawer (Nested) */}
            <OverrideRoleDrawer
                type='override-popup-container'
                open={overrideDrawerOpen}
                onClose={() => setOverrideDrawerOpen(false)}
                roleName={getRoleName(formik.values.role)}
                userId={userData?.id}
                initialPermissions={userData?.permissions ? transformUserPermissions(userData.permissions) : undefined}
                initialOverrides={userData?.overrides ? transformUserOverrides(userData.overrides) : undefined}
                onSave={(data) => {
                    console.log('Override role saved:', data);
                    // Update hasOverrides state based on saved overrides
                    const savedOverrides = data.overrides || {};
                    const hasOverridesData = Object.keys(savedOverrides).length > 0;
                    setHasOverrides(hasOverridesData);

                    // Notify parent component (UserList) about override save
                    if (onOverrideSave && data.overrides) {
                        onOverrideSave(data.overrides);
                    }
                }}
            />

            <ConfirmActionModal
                open={showRoleChangeModal}
                title="Override Permissions"
                description="This user currently has custom permissions. Changing the role will remove these permissions and apply the default permissions for the new role. Do you want to continue?"
                confirmText="Yes, Apply New Role"
                cancelText="No, Cancel"

                onConfirm={() => {
                    if (!pendingRole) return;

                    formik.setFieldValue('role', pendingRole);

                    const newRolePermissions = getRolePermissionsById(pendingRole);

                    if (userData) {
                        userData.permissions = newRolePermissions;
                        userData.overrides = {};
                    }

                    setHasOverrides(false);
                    if (onOverrideSave) {
                        onOverrideSave({});
                    }

                    setPreviousRole(pendingRole);

                    setShowRoleChangeModal(false);
                    setPendingRole(null);
                }}

                onClose={() => {
                    setShowRoleChangeModal(false);
                    setPendingRole(null);
                }}
            />


        </>
    );
}

export default React.memo(UserDrawer);
