import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ModulePermission {
    access?: boolean;
    actions?: string[];
    client_scope?: "assigned" | "all";
    refresh?: boolean;
}

export interface RolePermissions {
    [moduleKey: string]: ModulePermission;
}

export interface PermissionsState {
    // Map of module keys to their access status
    moduleAccess: {
        [moduleKey: string]: boolean;
    };
    // Map of role IDs to their permissions
    rolePermissions: {
        [roleId: string]: RolePermissions;
    };
    // Current user's effective permissions (merged from their role)
    userPermissions: RolePermissions | null;
}

const initialState: PermissionsState = {
    moduleAccess: {},
    rolePermissions: {},
    userPermissions: null,
};

const permissionsSlice = createSlice({
    name: "permissions",
    initialState,
    reducers: {
        /**
         * Set module access for a specific module
         */
        setModuleAccess: (
            state,
            action: PayloadAction<{ moduleKey: string; hasAccess: boolean }>
        ) => {
            const { moduleKey, hasAccess } = action.payload;
            state.moduleAccess[moduleKey] = hasAccess;
        },

        /**
         * Set permissions for a specific role
         */
        setRolePermissions: (
            state,
            action: PayloadAction<{ roleId: string; permissions: RolePermissions }>
        ) => {
            const { roleId, permissions } = action.payload;
            state.rolePermissions[roleId] = permissions;
        },

        /**
         * Update user's effective permissions (typically set after login or role change)
         */
        setUserPermissions: (
            state,
            action: PayloadAction<RolePermissions | null>
        ) => {
            state.userPermissions = action.payload;
            // Update module access based on user permissions
            if (action.payload) {
                Object.keys(action.payload).forEach((moduleKey) => {
                    state.moduleAccess[moduleKey] = action.payload![moduleKey].access === true;
                });
            }
        },

        /**
         * Clear all permissions (on logout)
         */
        clearPermissions: (state) => {
            state.moduleAccess = {};
            state.rolePermissions = {};
            state.userPermissions = null;
        },
    },
});

export const {
    setModuleAccess,
    setRolePermissions,
    setUserPermissions,
    clearPermissions,
} = permissionsSlice.actions;

// Selectors
export const selectModuleAccess = (state: { permissions: PermissionsState }) =>
    state.permissions.moduleAccess;

export const selectRolePermissions = (state: { permissions: PermissionsState }) =>
    state.permissions.rolePermissions;

export const selectUserPermissions = (state: { permissions: PermissionsState }) =>
    state.permissions.userPermissions;

export const selectHasModuleAccess = (moduleKey: string) => (state: { permissions: PermissionsState }) =>
    state.permissions.moduleAccess[moduleKey] === true;

export default permissionsSlice.reducer;

