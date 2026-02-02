import Role from '../db/models/role.js';
import { createLog } from '../services/logService.js';
import User from '../db/models/user.js';

export const createRole = async (req, res) => {
  try {
    const { name, permissions, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Role name is required',
        data: null
      });
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Role with this name already exists',
        data: null
      });
    }

    // Validate
    const validatedPermissions = {};
    if (permissions && typeof permissions === 'object') {
      Object.keys(permissions).forEach(moduleKey => {
        const modulePerm = permissions[moduleKey];
        
        if (modulePerm && typeof modulePerm === 'object') {
          validatedPermissions[moduleKey] = {
            access: Boolean(modulePerm.access || false),
            actions: Array.isArray(modulePerm.actions) ? modulePerm.actions : [],
            client_scope: modulePerm.client_scope === 'all' ? 'all' : 'assigned',
            refresh: Boolean(modulePerm.refresh || false)
          };
        }
      });
    }
    const newRole = new Role({
      name,
      description,
      permissions: validatedPermissions,
    });

    await newRole.save();

    if (req.user && req.user._id) {
      await createLog(req.user._id, 'role_update', {
        action: 'create',
        role_id: newRole._id,
        name: newRole.name,
        description: newRole.description,
        permissions_count: Object.keys(validatedPermissions).length
      }, req);
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been Created successfully',
      data: newRole
    });
  } catch (error) {
    console.error('Create role error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in creating role',
      data: error.message
    });
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 }).select('-__v');

    const rolesWithUsers = await Promise.all(
      roles.map(async (role) => {
        const users = await User.find({ role_id: role._id })
          .select('first_name last_name')
          .lean();

        const roleObj = role.toObject({ flattenMaps: true }); 
        
        return {
          ...roleObj,
          users: users.map(user => ({
            first_name: user.first_name,
            last_name: user.last_name
          }))
        };
      })
    );

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: {
        count: roles.length,
        roles: rolesWithUsers
      }
    });
  } catch (error) {
    console.error('Get all roles error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in fetching roles',
      data: error.message
    });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await Role.findById(roleId).select('-__v');
    
    if (!role) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Role not found',
        data: null
      });
    }

    const users = await User.find({ role_id: role._id })
      .select('first_name last_name')
      .lean();

    const roleObj = role.toObject({ flattenMaps: true }); 
    
    const roleWithUsers = {
      ...roleObj,
      users: users.map(user => ({
        first_name: user.first_name,
        last_name: user.last_name
      }))
    };

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: roleWithUsers
    });
  } catch (error) {
    console.error('Get role error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in fetching role',
      data: error.message
    });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, permissions, description } = req.body;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Role not found',
        data: null
      });
    }

    // Store OLD permissions BEFORE update (as object)
    const oldPermissions = role.permissions ? 
      (role.permissions instanceof Map ? 
        Object.fromEntries(role.permissions) : 
        role.permissions) : 
      {};

    // Update role name if provided
    if (name && name !== role.name) {
      const existingRoleWithName = await Role.findOne({ 
        name, 
        _id: { $ne: roleId } 
      });
      
      if (existingRoleWithName) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Role with this name already exists',
          data: null
        });
      }
      role.name = name;
    }

    // Update description if provided
    if (description !== undefined) {
      role.description = description;
    }

    // Update permissions if provided (as plain object, not Map)
    let newPermissionsObj = role.permissions;
    if (permissions && typeof permissions === 'object') {
      const updatedPermissions: any = {};
      
      Object.keys(permissions).forEach(moduleKey => {
        const modulePerm = permissions[moduleKey];
        
        if (modulePerm && typeof modulePerm === 'object') {
          updatedPermissions[moduleKey] = {
            access: Boolean(modulePerm.access || false),
            actions: Array.isArray(modulePerm.actions) ? modulePerm.actions : [],
            client_scope: modulePerm.client_scope === 'all' ? 'all' : 'assigned',
            refresh: Boolean(modulePerm.refresh || false)
          };
        }
      });
      
      role.permissions = updatedPermissions;
      newPermissionsObj = updatedPermissions;
    }
    
    await role.save();
    
    // Track permission changes and update user overrides
    if (permissions && typeof permissions === 'object' && Object.keys(oldPermissions).length > 0) {
      const users = await User.find({ role_id: roleId });
      
      console.log(`Updating overrides for ${users.length} users with role: ${role.name}`);
      
      for (const user of users) {
        await updateUserOverridesForRoleChange(user, oldPermissions, newPermissionsObj);
      }
      
      console.log('User overrides updated successfully');
    }

    // Log the action
    if (req.user && req.user._id) {
      await createLog(req.user._id, 'role_update', {
        action: 'update',
        role_id: roleId,
        role_name: role.name,
        updated_fields: Object.keys(req.body),
      }, req);
    }

    const updatedRole = await Role.findById(roleId).select('-__v');
    const responseData = updatedRole.toObject({ flattenMaps: true });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been Updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in updating role',
      data: error.message
    });
  }
};

const updateUserOverridesForRoleChange = async (user: any, oldRolePermissions: any, newRolePermissions: any) => {
  try {
    const userOverrides: any = user.overrides || {};
    const updatedOverrides: any = { ...userOverrides };
    
    for (const [moduleName, newPerm] of Object.entries(newRolePermissions)) {
      const oldPerm = (oldRolePermissions as any)[moduleName];
      
      if (oldPerm) {
        const overrideChanges: any = {};
        if ((newPerm as any).access !== (oldPerm as any).access) {
          overrideChanges.access = (newPerm as any).access;
        }
        const oldActionsSorted = ((oldPerm as any).actions || []).sort();
        const newActionsSorted = ((newPerm as any).actions || []).sort();
        if (JSON.stringify(oldActionsSorted) !== JSON.stringify(newActionsSorted)) {
          overrideChanges.actions = (newPerm as any).actions;
        }
        if ((newPerm as any).client_scope !== (oldPerm as any).client_scope) {
          overrideChanges.client_scope = (newPerm as any).client_scope;
        }
        if ((newPerm as any).refresh !== (oldPerm as any).refresh) {
          overrideChanges.refresh = (newPerm as any).refresh;
        }
        
        if (Object.keys(overrideChanges).length > 0) {
          const existingOverride = userOverrides[moduleName] || {};
          
          const mergedOverride = {
            ...existingOverride,
            ...overrideChanges
          };
          
          updatedOverrides[moduleName] = mergedOverride;
          console.log(`User ${user.email}: Added override for ${moduleName}:`, overrideChanges);
        }
      } else {
        const overrideChanges: any = {};
        
        if ((newPerm as any).access === false) {
          overrideChanges.access = false;
        }
        
        if ((newPerm as any).actions && (newPerm as any).actions.length > 0) {
          overrideChanges.actions = (newPerm as any).actions;
        }
        
        if ((newPerm as any).client_scope && (newPerm as any).client_scope !== 'all') {
          overrideChanges.client_scope = (newPerm as any).client_scope;
        }
        
        if ((newPerm as any).refresh === false) {
          overrideChanges.refresh = false;
        }
        
        if (Object.keys(overrideChanges).length > 0) {
          updatedOverrides[moduleName] = overrideChanges;
          console.log(`User ${user.email}: Added override for new module ${moduleName}:`, overrideChanges);
        }
      }
    }
    
    for (const moduleName of Object.keys(oldRolePermissions)) {
      if (!(newRolePermissions as any)[moduleName]) {
        delete updatedOverrides[moduleName];
        console.log(`User ${user.email}: Removed override for deleted module ${moduleName}`);
      }
    }
    
    user.overrides = updatedOverrides;
    await user.save();
    
    return user.overrides;
  } catch (error) {
    console.error(`Error updating overrides for user ${user.email}:`, error);
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Role not found',
        data: null
      });
    }
    const usersWithRole = await User.countDocuments({ role_id: roleId });
    if (usersWithRole > 0) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`,
        data: null
      });
    }

    await Role.findByIdAndDelete(roleId);
    if (req.user && req.user._id) {
      await createLog(req.user._id, 'role_update', {
        action: 'delete',
        role_id: roleId,
        name: role.name
      }, req);
    }
    
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been deleted successfully',
      data: null
    });
    
  } catch (error) {
    console.error('Delete role error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in deleting role',
      data: error.message
    });
  }
};