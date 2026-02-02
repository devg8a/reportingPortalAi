import User from '../db/models/user.js';
import Role from '../db/models/role.js';
import ClientContacts from '../db/models/clientContacts.js';
import ClientDetails from '../db/models/clientDetails.js';

export const getFinalPermissions = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return {};
    }

    const role = await Role.findById(user.role_id);
    const userOverrides = user.overrides || new Map();
    
    const finalPermissions = {};
    
    if (role && role.permissions) {
      const rolePermissions = role.permissions || new Map();
      for (const [moduleName, rolePermission] of rolePermissions.entries()) {
        finalPermissions[moduleName] = {
          access: rolePermission.access || false,
          actions: [...(rolePermission.actions || [])],
          client_scope: rolePermission.client_scope || 'assigned',
          refresh: rolePermission.refresh || false
        };
      }
    }
    
    for (const [moduleName, override] of userOverrides.entries()) {
      if (!finalPermissions[moduleName]) {
        const newPermission : any = {};
        
        if (typeof override.access !== 'undefined') {
          newPermission.access = override.access;
        }
        if (override.actions !== undefined) {
          newPermission.actions = override.actions;
        }
        if (override.client_scope) {
          newPermission.client_scope = override.client_scope;
        }
        if (typeof override.refresh !== 'undefined') {
          newPermission.refresh = override.refresh;
        }
        
        if (Object.keys(newPermission).length > 0) {
          finalPermissions[moduleName] = newPermission;
        }
      } else {
        if (typeof override.access !== 'undefined') {
          finalPermissions[moduleName].access = override.access;
        }
        if (override.actions !== undefined) {
          finalPermissions[moduleName].actions = override.actions;
        }
        if (override.client_scope) {
          finalPermissions[moduleName].client_scope = override.client_scope;
        }
        if (typeof override.refresh !== 'undefined') {
          finalPermissions[moduleName].refresh = override.refresh;
        }
      }
    }
    
    return finalPermissions;
  } catch (error) {
      console.error('Error calculating final permissions:', error);
    return {};
  }
};

export const syncUserOverrides = async (userId, originalRolePermissions) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return new Map();
    }

    const userOverrides = user.overrides || new Map();
    const updatedOverrides = new Map();
    
    const role = await Role.findById(user.role_id);
    const currentRolePermissions = role?.permissions || new Map();
    
    for (const [moduleName, override] of userOverrides.entries()) {
      const originalRolePerm = originalRolePermissions?.get(moduleName);
      const currentRolePerm = currentRolePermissions.get(moduleName);
      
      if (!currentRolePerm) {
        continue;
      }
      
      const keptOverride : any = {};
      
      if (typeof override.access !== 'undefined') {
        keptOverride.access = override.access;
      }
      
      if (override.actions && override.actions.length > 0) {
        keptOverride.actions = override.actions;
      }
      
      if (override.client_scope) {
        keptOverride.client_scope = override.client_scope;
      }
      
      if (typeof override.refresh !== 'undefined') {
        keptOverride.refresh = override.refresh;
      }
      
      if (Object.keys(keptOverride).length > 0) {
        updatedOverrides.set(moduleName, keptOverride);
      }
    }
    
    user.overrides = updatedOverrides;
    await user.save();
    
    return user.overrides;
  } catch (error) {
    console.error('Error syncing overrides:', error);
    return new Map();
  }
};

export const getClientPermissions = async (clientContactId) => {
  try {
    const clientContact = await ClientContacts.findById(clientContactId);
    if (!clientContact) {
      return {};
    }

    const clientDetails = await ClientDetails.findById(clientContact.client_id);
    if (!clientDetails || !clientDetails.roles_id) {
      return {};
    }

    const role = await Role.findById(clientDetails.roles_id);
    if (!role) {
      return {};
    }

    const rolePermissions = role.permissions || new Map();
    const clientContactOverrides = clientContact.overrides || new Map();
    
    const finalPermissions = {};
    
    for (const [moduleName, rolePermission] of rolePermissions.entries()) {
      finalPermissions[moduleName] = {
        access: rolePermission.access || false,
        actions: [...(rolePermission.actions || [])],
        client_scope: rolePermission.client_scope || 'assigned',
        refresh: rolePermission.refresh || false
      };
    }
    
    for (const [moduleName, override] of clientContactOverrides.entries()) {
      if (finalPermissions[moduleName]) {
        if (typeof override.access !== 'undefined') {
          finalPermissions[moduleName].access = override.access;
        }
        if (override.actions && override.actions.length > 0) {
          finalPermissions[moduleName].actions = override.actions;
        }
        if (override.client_scope) {
          finalPermissions[moduleName].client_scope = override.client_scope;
        }
        if (typeof override.refresh !== 'undefined') {
          finalPermissions[moduleName].refresh = override.refresh;
        }
      }
    }
    
    return finalPermissions;
  } catch (error) {
    console.error('Error calculating client final permissions:', error);
    return {};
  }
};