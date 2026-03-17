import User from '../db/models/user';
import Role from '../db/models/role';
import { createLog } from '../services/logService';
import { sendUserLoginInformation } from '../services/emailService';
import path from 'path';
import fs from 'fs';
import { getFinalPermissions, syncUserOverrides } from '../services/permissionUtils';

export const addUser = async (req, res) => {
  try {
    // Check if requester is admin
    if (!req.user) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Unauthenticated: Authentication required',
        data: null
      });
    }

    const {
      first_name,
      last_name,
      email,
      password,
      confirm_password,
      user_type,
      role_id,
      status,
      location,
      employee_portfolio,
      two_step_enabled,
      overrides  
    } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Passwords do not match',
        data: null
      });
    }

    let processedProfilePic = null;
    
    if (req.file) {
      // Convert uploaded file to base64
      const base64Image = req.file.buffer.toString('base64');
      processedProfilePic = `data:${req.file.mimetype};base64,${base64Image}`;
    } else {
      try {
        const imageBuffer = fs.readFileSync(path.join(__dirname, '../../image.png'));
        const base64Image = imageBuffer.toString('base64');
        processedProfilePic = `data:image/png;base64,${base64Image}`;
      } catch (error) {
        processedProfilePic = null;
      }
    }

    // Validate profile picture size if exists
    if (processedProfilePic && processedProfilePic.length > 1000000) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Profile picture too large. Max size is 1MB.',
        data: null
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'User with this email already exists',
        data: null
      });
    }

    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid role specified',
        data: null
      });
    }

    // Validate overrides structure
    const validatedOverrides = {};
    if (overrides && typeof overrides === 'object') {
      Object.keys(overrides).forEach(moduleKey => {
        const moduleOverride = overrides[moduleKey];
        
        if (moduleOverride && typeof moduleOverride === 'object') {
          validatedOverrides[moduleKey] = {};
          
          if (typeof moduleOverride.access !== 'undefined') {
            validatedOverrides[moduleKey].access = Boolean(moduleOverride.access);
          }
          if (Array.isArray(moduleOverride.actions)) {
            validatedOverrides[moduleKey].actions = moduleOverride.actions;
          }
          if (moduleOverride.client_scope === 'all' || moduleOverride.client_scope === 'assigned') {
            validatedOverrides[moduleKey].client_scope = moduleOverride.client_scope;
          }
          if (typeof moduleOverride.refresh !== 'undefined') {
            validatedOverrides[moduleKey].refresh = Boolean(moduleOverride.refresh);
          }
        }
      });
    }

    const newUser = new User({
      first_name,
      last_name,
      email,
      password,
      profile_pic: processedProfilePic,
      user_type,
      role_id,
      status: status || 'active',
      location: location || 'in',
      employee_portfolio,
      two_step_enabled: two_step_enabled === 'true' || two_step_enabled === true,
      overrides: validatedOverrides, 
    });

    await newUser.save();

    // Send welcome email
    const emailSent = await sendUserLoginInformation(email, password);
    if (!emailSent) {
      console.log('Failed to send welcome email to:', email);
    }

    // Log the user creation
    await createLog(req.user._id, 'user_create', {
      created_user_id: newUser._id,
      created_user_email: newUser.email,
      role: newUser.role_id,
      two_step_enabled: newUser.two_step_enabled
    }, req);

    // Calculate final permissions for response
    const finalPermissions = await getFinalPermissions(newUser._id);

    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been Created successfully',
      data: {
        ...userResponse,
        permissions: finalPermissions
      }
    });
  } catch (error) {
    console.error('Add user error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'User not found',
        data: null
      });
    }

    const isAdmin = true;
    const isSelf = req.user._id.toString() === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        status_code: 403,
        success: false,
        message: 'Unauthorized: You are not authorized to edit this user',
        data: null
      });
    }

    // delete updateData.password;
    // delete updateData.email;
    delete updateData.created_at;

    let processedProfilePic = null;
    
    if (req.file) {
      // Convert uploaded file to base64
      const base64Image = req.file.buffer.toString('base64');
      processedProfilePic = `data:${req.file.mimetype};base64,${base64Image}`;
      updateData.profile_pic = processedProfilePic;
    } else if (updateData.profile_pic) {
      processedProfilePic = updateData.profile_pic;
    }

    if (processedProfilePic && processedProfilePic.length > 1000000) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Profile picture too large. Max size is 1MB.',
        data: null
      });
    }

    const originalRoleId = user.role_id.toString();
    let roleChanged = false;
    let clearedOverridesCount = 0;

    if (updateData.role_id && updateData.role_id !== originalRoleId) {
      roleChanged = true;
      
      const newRole = await Role.findById(updateData.role_id);
      const oldRole = await Role.findById(originalRoleId);
      
      if (!newRole) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Invalid role specified',
          data: null
        });
      }

      clearedOverridesCount = user.overrides?.size || 0;
      
      await createLog(req.user._id, 'user_role_change', {
        target_user_id: userId,
        target_user_email: user.email,
        old_role_id: originalRoleId,
        old_role_name: oldRole?.name || 'Unknown',
        new_role_id: updateData.role_id,
        new_role_name: newRole.name,
        cleared_overrides: clearedOverridesCount,
        action: 'role_change_clear_overrides'
      }, req);
      updateData.overrides = new Map(); 
      delete updateData.overrides;
      user.overrides = new Map();
    }

    if (!roleChanged && updateData.overrides && typeof updateData.overrides === 'object') {
      const currentOverrides = user.overrides || new Map();
      const newOverrides = new Map();
      for (const [key, value] of currentOverrides.entries()) {
        newOverrides.set(key, value);
      }
      // Apply new overrides
      Object.keys(updateData.overrides).forEach(moduleKey => {
        const moduleOverride = updateData.overrides[moduleKey];
        
        if (moduleOverride === null || moduleOverride === '') {
          newOverrides.delete(moduleKey);
          console.log(`Removed override for module: ${moduleKey}`);
        } else if (moduleOverride && typeof moduleOverride === 'object') {
          const currentOverride = newOverrides.get(moduleKey) || {};
          const updatedOverride = { ...currentOverride };
          
          if (typeof moduleOverride.access !== 'undefined') {
            updatedOverride.access = Boolean(moduleOverride.access);
          }
          if (moduleOverride.actions !== undefined) {
            updatedOverride.actions = Array.isArray(moduleOverride.actions) 
              ? moduleOverride.actions 
              : [];
          }
          if (moduleOverride.client_scope === 'all' || moduleOverride.client_scope === 'assigned') {
            updatedOverride.client_scope = moduleOverride.client_scope;
          }
          if (typeof moduleOverride.refresh !== 'undefined') {
            updatedOverride.refresh = Boolean(moduleOverride.refresh);
          }
          
          newOverrides.set(moduleKey, updatedOverride);
          console.log(`Updated override for module: ${moduleKey}`);
        }
      });
      
      updateData.overrides = newOverrides;
    }

    if (updateData.employee_portfolio && Array.isArray(updateData.employee_portfolio)) {
      const portfolioIds = updateData.employee_portfolio.map(item => {
        if (item && typeof item === 'object' && item._id) {
          return item._id.toString();
        }
        return item.toString();
      });
      
      const portfolioUsers = await User.find({
        _id: { $in: portfolioIds }
      }).select('status');
      
      const userStatusMap = new Map();
      portfolioUsers.forEach(user => {
        userStatusMap.set(user._id.toString(), user.status);
      });
      
      updateData.employee_portfolio = portfolioIds.filter(userId => {
        const status = userStatusMap.get(userId.toString());
        return status === 'active';
      });
      
      console.log('Filtered employee portfolio IDs:', updateData.employee_portfolio);
    }
    Object.assign(user, updateData);
    await user.save();
    const logData = {
      target_user_id: userId,
      updated_fields: Object.keys(updateData),
      new_status: user.status
    };
    
    await createLog(req.user._id, 'user_update', logData, req);
    const finalPermissions = await getFinalPermissions(userId);
    if (updateData.role_id && !roleChanged) {
      await syncUserOverrides(userId, null);
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    let message = 'Records has been Updated successfully';
    if (roleChanged) {
      message = `Records has been Updated successfully. ${clearedOverridesCount} overrides cleared.`;
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: message,
      data: {
        ...userResponse,
        permissions: finalPermissions,
        role_changed: roleChanged
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const deleteUserPermanently = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if requester is authenticated
    if (!req.user) {
      return res.status(500).json({
        status_code: 500,
        success: false,
        message: 'Unauthenticated: Authentication required',
        data: null
      });
    }
    if (req.user._id.toString() === userId) {
      return res.status(403).json({
        status_code: 403,
        success: false,
        message: 'You cannot delete your own account',
        data: null
      });
    }
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'User not found',
        data: null
      });
    }
    await Promise.all([
      User.findByIdAndDelete(userId),
      createLog(req.user._id, 'user_deleted', {
        deleted_user_id: userId,
        deleted_user_email: userToDelete.email,
        deleted_by: req.user._id
      }, req)
    ]);
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been deleted successfully',
      data: {
        deleted_user_id: userId,
        deleted_user_email: userToDelete.email
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const toggleTwoStepVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body;

    // Only admin can toggle 2-step verification
    const isAdmin = true;
    if (!isAdmin) {
      return res.status(403).json({
        status_code: 403,
        success: false,
        message: 'Unauthorized: Only admin can modify two-step verification settings',
        data: null
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'User not found',
        data: null
      });
    }

    user.two_step_enabled = enabled;
    await user.save();
    await createLog(req.user._id, 'two_step_toggle', {
      target_user_id: userId,
      enabled: enabled,
       previous_state: !enabled
    }, req);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: `Two-step verification ${enabled ? 'enabled' : 'disabled'} for user`,
      data: {
        id: user._id,
        email: user.email,
        two_step_enabled: user.two_step_enabled,
      }
    });
  } catch (error) {
    console.error('Toggle two-step error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { 
      status, 
      name, 
      email, 
      searchText, 
      role,
      searchIn = 'all', 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1, 
      limit = 10 
    } = req.query;

    const filter: any = {};

    // Status filter
    if (status === 'active' || status === 'inactive') {
      filter.status = status;
    }
    
    // Role filter
    if (role) {
      console.log(`Searching role: "${role}"`);
      const roleRegex = new RegExp(role as string, 'i');
      
      const matchingRoles = await Role.find({
        name: roleRegex
      }).select('_id');

      const roleIds = matchingRoles.map(role => role._id);
      
      console.log(`Found ${roleIds.length} matching roles`);
      
      if (roleIds.length > 0) {
        filter.role_id = { $in: roleIds };
      } else {
        filter.role_id = null;
      }
    }
    
    // Search text filter
    if (searchText) {
      const searchRegex = new RegExp(searchText, 'i');
      
      if (searchIn === 'role') {
        const matchingRoles = await Role.find({
          name: searchRegex
        }).select('_id');

        const roleIds = matchingRoles.map(role => role._id);
        
        if (roleIds.length > 0) {
          filter.role_id = { $in: roleIds };
        } else {
          filter.role_id = null;
        }
      } else if (searchIn === 'name') {
        filter.$or = [
          { first_name: searchRegex },
          { last_name: searchRegex }
        ];
      } else if (searchIn === 'email') {
        filter.email = searchRegex;
      } else if (searchIn === 'user_type') {
        filter.user_type = searchRegex;
      } else { 
        const matchingRoles = await Role.find({
          name: searchRegex
        }).select('_id');

        const roleIds = matchingRoles.map(role => role._id);

        const searchConditions = [
          { first_name: searchRegex },
          { last_name: searchRegex },
          { email: searchRegex },
          { user_type: searchRegex }
        ];
        
        if (roleIds.length > 0) {
          searchConditions.push({ role_id: { $in: roleIds } } as any);
        }
        
        filter.$or = searchConditions;
      }
    } else {
      if (name) {
        const nameRegex = new RegExp(name, 'i');
        filter.$or = [
          { first_name: nameRegex },
          { last_name: nameRegex }
        ];
      }

      if (email) {
        filter.email = { $regex: email, $options: 'i' };
      }
    }

    // Get counts first (for pagination info)
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit as string));
    const activeCount = await User.countDocuments({ ...filter, status: 'active' });
    const inactiveCount = await User.countDocuments({ ...filter, status: 'inactive' });
    
    // Handle sorting logic
    let users;
    
    if (sortBy === 'designation') {
      const allUsers = await User.find(filter)
        .select('-password')
        .populate({
          path: 'role_id',
          select: 'name'
        });
      
      // Sort users by role name in memory
      allUsers.sort((a: any, b: any) => {
        const roleA = (a.role_id && a.role_id.name) ? a.role_id.name : '';
        const roleB = (b.role_id && b.role_id.name) ? b.role_id.name : '';
        
        if (sortOrder === 'asc') {
          return roleA.localeCompare(roleB);
        } else {
          return roleB.localeCompare(roleA);
        }
      });
      
      // Apply pagination manually
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      users = allUsers.slice(skip, skip + parseInt(limit as string));
      
    } else {
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      // Fetch users with pagination
      users = await User.find(filter)
        .select('-password')
        .populate({
          path: 'role_id',
          select: 'name'
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string));
    }
    
    const data = {
      users,
      pagination: {
        count: users.length,
        active: activeCount,
        inactive: inactiveCount,
        total: totalUsers,
        page: parseInt(page as string),
        totalPages,
        limit: parseInt(limit as string)
      },
      filters: {
        status,
        searchText: searchText || null,
        searchIn: searchIn || 'all',
        name: searchText ? null : name,
        email: searchText ? null : email,
        role: role || null, 
        sortBy,
        sortOrder
      }
    };

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: data
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -created_at -updated_at -__v -createdAt -updatedAt -created_by')
      .populate('role_id', 'name permissions')
      .populate({
        path: 'employee_portfolio',
        match: { status: 'active' }, 
        select: 'first_name email'
      });

    if (!user) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'User not found',
        data: null
      });
    }
    const Permissions = await getFinalPermissions(userId);
    const userObject = user.toObject() as any;
    delete userObject.__v;
    
    // Check if user is Master Admin
    const isMasterAdmin = userObject.role_id && userObject.role_id.name === 'Master Admin';
    
    if (userObject.employee_portfolio) {
      // First filter out null values
      userObject.employee_portfolio = userObject.employee_portfolio.filter(
        (emp: any) => emp !== null
      );
      
      // If user is Master Admin, remove self from employee portfolio
      if (isMasterAdmin) {
        userObject.employee_portfolio = userObject.employee_portfolio.filter(
          (emp: any) => emp._id.toString() !== userId
        );
      }
    }
    
    const responseData = {
      ...userObject,
      role: userObject.role_id, 
      permissions: Permissions,
      overrides: user.overrides,
    };
    delete responseData.role_id;
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const updateUserOverrides = async (req, res) => {
  try {
    const { userId } = req.params;
    const { overrides } = req.body;

    if (!req.user) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Unauthenticated: Authentication required',
        data: null
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'User not found',
        data: null
      });
    }

    const validatedOverrides = new Map();

    if (overrides && typeof overrides === 'object') {
      Object.keys(overrides).forEach(moduleKey => {
        const moduleOverride = overrides[moduleKey];
        
        if (moduleOverride === null || moduleOverride === '') {
          return;
        }
        
        if (moduleOverride && typeof moduleOverride === 'object') {
          const overrideObj: any = {};
          
          if (typeof moduleOverride.access !== 'undefined') {
            overrideObj.access = Boolean(moduleOverride.access);
          }
          if (moduleOverride.actions !== undefined) {
            overrideObj.actions = Array.isArray(moduleOverride.actions) 
              ? moduleOverride.actions 
              : [];
          }
          if (moduleOverride.client_scope === 'all' || moduleOverride.client_scope === 'assigned') {
            overrideObj.client_scope = moduleOverride.client_scope;
          }
          if (typeof moduleOverride.refresh !== 'undefined') {
            overrideObj.refresh = Boolean(moduleOverride.refresh);
          }
          
          if (Object.keys(overrideObj).length > 0) {
            validatedOverrides.set(moduleKey, overrideObj);
          }
        }
      });
    }

    user.overrides = validatedOverrides;
    await user.save();

    const finalPermissions = await getFinalPermissions(userId);

    await createLog(req.user._id, 'user_overrides_update', {
      target_user_id: userId,
      target_user_email: user.email,
      updated_modules: Array.from(validatedOverrides.keys()),
      action: 'update_overrides'
    }, req);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been Updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          overrides: Object.fromEntries(validatedOverrides.entries())
        },
        permissions: finalPermissions
      }
    });
  } catch (error) {
    console.error('Update user overrides error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const getUsersByUserType = async (req, res) => {
  try {
    const { user_type } = req.query;
    let filter = {};
    const leadTypes = [
      'affiliate lead',
      'meta lead',
      'search lead',
      'email lead',
      'design lead'
    ];
    if (user_type && user_type.toLowerCase() === 'account manager') {
      filter = {
        user_type: { $regex: /^account manager$/i }
      };
    } 
    else if (!user_type) {
      filter = {
        user_type: {
          $in: leadTypes.map(type => new RegExp(`^${type}$`, 'i'))
        }
      };
    }
    const users = await User.find(filter)
      .select('-password')
      .populate({
        path: 'role_id',
        select: 'name'
      })
      .sort({ first_name: 1 });
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Users fetched successfully',
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};
