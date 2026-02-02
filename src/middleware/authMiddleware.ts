import jwt from 'jsonwebtoken';
import User from '../db/models/user';
import ClientContacts from '../db/models/clientContacts';
import { getFinalPermissions, getClientPermissions } from "../services/permissionUtils";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const module_key = req?.header('modulekey');
    
    if (!token || !module_key) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : !token ? 'Unauthenticated: Authorization token missing.' : 'Module key missing.',
        data        : []
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    // Check entity type
    if (decoded.entity_type === 'user') {
      const user = await User.findById(decoded.user_id).select('-password');

      if (!user || user.status !== 'active') {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'Unauthenticated: User not found or inactive.',
          data: null
        });
      }

       const hasAccess = await checkpermissions(module_key,decoded.user_id,decoded.entity_type);
      if(!hasAccess){
        return res.status(403).json({
            status_code: 403,
            success: false,
            message: 'Unauthorized Access: User do not have permission to access this resource. Contact Admin.',
            data: []
        });
      }

      // Refresh permissions to ensure they're up to date
      const freshPermissions = await getFinalPermissions(decoded.user_id);
      req.permissions = freshPermissions;
      
      req.user = {
        ...decoded,
        _id: decoded.user_id
      };
      
    } else if (decoded.entity_type === 'client') {
      const clientContact = await ClientContacts.findById(decoded.client_contact_id).select('-password');

      if (!clientContact || clientContact.status !== 'active') {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'Unauthenticated: Client contact not found or inactive.',
          data: []
        });
      }


       const hasAccess = await checkpermissions(module_key,decoded.user_id,decoded.entity_type);
      if(!hasAccess){
        return res.status(403).json({
            status_code: 403,
            success: false,
            message: 'Unauthorized Access: User do not have permission to access this resource. Contact Admin.',
            data: []
        });
      }
      
      // Refresh permissions to ensure they're up to date
      const freshPermissions = await getClientPermissions(decoded.client_contact_id);
      req.permissions = freshPermissions;
      
      req.user = {
        ...decoded,
        _id: decoded.client_contact_id
      };
      
    } else {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Unauthenticated: Invalid entity type in token.',
        data: []
      });
    }

    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      status_code: 401,
      success: false,
      message: 'Unauthenticated: Invalid or Expired token.',
      data: []
    });
  }
};

async function checkpermissions(module_key,userId,entityType){
    const userPermissions = await getFinalPermissions(userId);
    const hasAccess       = userPermissions?.[module_key]?.access || false;
    // console.log('hasAccess==>',module_key+ ' '+hasAccess);
    return hasAccess;
}

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(422).json({
      status_code : 422,
      success     : false,
      message     : 'Unauthenticated: Authentication required.',
      data        : null
    });
  }

  next();
};

