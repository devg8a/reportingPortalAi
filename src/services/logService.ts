import Log  from '../db/models/log';

export const createLog = async (userId, action, details, req = null) => {
  try {
    const logData = {
      user_id: userId,
      action,
      details
    };

    // if (req) {
    //   logData.ip_address = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //   logData.user_agent = req.headers['user-agent'];
    // }

    const log = new Log(logData);
    await log.save();
    
    console.log(`Log created: ${action} by user ${userId}`);
    return log;
  } catch (error) {
    console.error('Error creating log:', error);
  }
};
