import { Request, Response } from 'express';
import Log from '../db/models/log';

export const getAllLogs = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      user_id, 
      start_date, 
      end_date 
    } = req.query;

    // Build filter object
    const filter: Record<string, any> = {};
    
    if (action) filter.action = action as string;
    if (user_id) filter.user_id = user_id as string;
    
    // Date range filter
    if (start_date || end_date) {
      filter.created_at = {};
      
      if (start_date) {
        const start = new Date(start_date as string);
        start.setHours(0, 0, 0, 0);
        filter.created_at.$gte = start;
      }
      
      if (end_date) {
        const end = new Date(end_date as string);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Fetch logs with pagination
    const logs = await Log.find(filter)
      .populate('user_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    // Get total count
    const count = await Log.countDocuments(filter);
    const totalPages = Math.ceil(count / parseInt(limit as string));

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Records has been fetched successfully',
      data: {
        logs,
        pagination: {
          count: logs.length,
          total: count,
          page: parseInt(page as string),
          totalPages,
          limit: parseInt(limit as string)
        },
        filters: {
          action,
          user_id,
          start_date,
          end_date
        }
      }
    });

  } catch (error: any) {
    console.error('Get logs error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching logs',
      data: error.message
    });
  }
};

export const getUserLogs = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 50 
    } = req.query;

    // Calculate pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Fetch logs for specific user
    const logs = await Log.find({ user_id: userId })
      .populate('user_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    // Get total count
    const count = await Log.countDocuments({ user_id: userId });
    const totalPages = Math.ceil(count / parseInt(limit as string));

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'User logs fetched successfully',
      data: {
        userId,
        logs,
        pagination: {
          count: logs.length,
          total: count,
          page: parseInt(page as string),
          totalPages,
          limit: parseInt(limit as string)
        }
      }
    });

  } catch (error: any) {
    console.error('Get user logs error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching user logs',
      data: error.message
    });
  }
};

// Get logs by action type
export const getLogsByAction = async (req: Request, res: Response) => {
  try {
    const { action } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const logs = await Log.find({ action })
      .populate('user_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const count = await Log.countDocuments({ action });
    const totalPages = Math.ceil(count / parseInt(limit as string));

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: `Logs for action '${action}' fetched successfully`,
      data: {
        action,
        logs,
        pagination: {
          count: logs.length,
          total: count,
          page: parseInt(page as string),
          totalPages,
          limit: parseInt(limit as string)
        }
      }
    });

  } catch (error: any) {
    console.error('Get logs by action error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching logs by action',
      data: error.message
    });
  }
};