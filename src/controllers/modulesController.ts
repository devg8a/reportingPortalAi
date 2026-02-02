import Module from '../db/models/modules.js';
import jwt from 'jsonwebtoken';
import { getFinalPermissions } from '../services/permissionUtils.js';

const validateSubModules = (subModules) => {
  if (!Array.isArray(subModules)) return true;

  for (const subMod of subModules) {
    if (subMod.sub_modules && Array.isArray(subMod.sub_modules) && subMod.sub_modules.length > 0) {
      const isValid = validateSubModules(subMod.sub_modules);
      if (!isValid) return false;
    } else {
      if (!subMod.url) {
        return false;
      }
      if (!subMod.permissions) {
        return false;
      }
    }
  }
  return true;
};

export const getAllModules = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    const freshPermissions = await getFinalPermissions(decoded.user_id);
    const userPermissions = freshPermissions || {};
    
    const modules = await Module.find().sort({ order: 1 });
    const processModules = (moduleList) => {
      return moduleList.map(module => {
        const moduleObj = module.toObject ? module.toObject() : module;
        const moduleKey = moduleObj.key;
        const hasAccess = userPermissions[moduleKey]?.access === true;

        if (moduleObj.permissions) {
          moduleObj.permissions.access = hasAccess;
        }

        if (moduleObj.sub_modules && moduleObj.sub_modules.length > 0) {
          moduleObj.sub_modules = processModules(moduleObj.sub_modules);
        }

        if (moduleObj.is_parent) {
          delete moduleObj.permissions;
          delete moduleObj.url;
        }

        return moduleObj;
      });
    };

    const processedModules = processModules(modules);

    res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: processedModules
    });
  } catch (error) {
    let status_code = error.name === 'TokenExpiredError' ? 401 : 500;
    res.status(status_code).json({
      status_code: status_code,
      success: false,
      message: error.message,
      data: null
    });
  }
};

export const getModulesById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);

    if (!module) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Module not found',
        data: null
      });
    }

    const moduleObj = module.toObject();

    if (module.is_parent) {
      delete moduleObj.permissions;
      delete moduleObj.url;
    }

    res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: moduleObj
    });
  } catch (error) {
    let status_code = error.name === 'TokenExpiredError' ? 401 : 500;
    res.status(status_code).json({
      status_code: status_code,
      success: false,
      message: error.message,
      data: null
    });
  }
};

export const createModules = async (req, res) => {
  try {
    const { order, key, module_name, url, permissions, sub_modules } = req.body;

    if (!module_name || !key || order === undefined) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'module_name, key, and order are required',
        data: null
      });
    }

    const existingModule = await Module.findOne({ $or: [{ module_name }, { key }] });
    if (existingModule) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Module with this name or key already exists',
        data: null
      });
    }

    let isParent = false;

    if (sub_modules && Array.isArray(sub_modules) && sub_modules.length > 0) {
      isParent = true;

      // Validate nested sub_modules structure
      if (!validateSubModules(sub_modules)) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'URL and permissions are required for leaf sub-modules',
          data: null
        });
      }
    } else {
      if (!url) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'URL is required for non-parent modules',
          data: null
        });
      }

      if (!permissions) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Permissions are required for non-parent modules',
          data: null
        });
      }
    }

    const newModule = new Module({
      order,
      key,
      module_name,
      url: isParent ? undefined : url,
      permissions: isParent ? null : {
        access: permissions?.access,
        actions: permissions?.actions,
        client_scope: permissions?.client_scope,
        refresh: permissions?.refresh
      },
      sub_modules: sub_modules || [],
      is_parent: isParent
    });

    const savedModule = await newModule.save();

    const responseData = savedModule.toObject();
    if (isParent) {
      delete responseData.permissions;
      delete responseData.url;
    }

    res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been Created successfully',
      data: responseData
    });
  } catch (error) {
    let status_code = error.name === 'TokenExpiredError' ? 401 : 500;
    res.status(status_code).json({
      status_code: status_code,
      success: false,
      message: error.message,
      data: null
    });
  }
};

export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { order, key, module_name, url, permissions, sub_modules } = req.body;

    const module = await Module.findById(id);
    if (!module) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Module not found',
        data: null
      });
    }

    if (module_name && module_name !== module.module_name) {
      const existingModule = await Module.findOne({
        module_name,
        _id: { $ne: id }
      });
      if (existingModule) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Module with this name already exists',
          data: null
        });
      }
      module.module_name = module_name;
    }

    if (key && key !== module.key) {
      const existingModule = await Module.findOne({
        key,
        _id: { $ne: id }
      });
      if (existingModule) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Module with this key already exists',
          data: null
        });
      }
      module.key = key;
    }

    if (order !== undefined) module.order = order;

    if (sub_modules && Array.isArray(sub_modules) && sub_modules.length > 0) {
      if (!validateSubModules(sub_modules)) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'URL and permissions are required for leaf sub-modules',
          data: null
        });
      }

      (module as any).sub_modules = sub_modules;
      module.is_parent = true;
      module.url = undefined;
      module.permissions = null;

    } else {
      if (!url) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'URL is required for non-parent modules',
          data: null
        });
      }

      if (!permissions) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Permissions are required for non-parent modules',
          data: null
        });
      }

      (module as any).sub_modules = [];
      module.is_parent = false;
      module.url = url;
      module.permissions = {
        access: permissions.access,
        actions: permissions.actions,
        client_scope: permissions.client_scope,
        refresh: permissions.refresh
      };
    }

    await module.save();

    const responseData = module.toObject();
    if (module.is_parent) {
      delete responseData.permissions;
      delete responseData.url;
    }

    res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been Updated successfully',
      data: responseData
    });
  } catch (error) {
    let status_code = error.name === 'TokenExpiredError' ? 401 : 500;
    res.status(status_code).json({
      status_code: status_code,
      success: false,
      message: error.message,
      data: null
    });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    const module = await Module.findById(id);
    if (!module) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Module not found',
        data: null
      });
    }

    await Module.findByIdAndDelete(id);

    res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been deleted successfully',
      data: { id }
    });
  } catch (error) {
    let status_code = error.name === 'TokenExpiredError' ? 401 : 500;
    res.status(status_code).json({
      status_code: status_code,
      success: false,
      message: error.message,
      data:'Error deleting Module'
    });
  }
};