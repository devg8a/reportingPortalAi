import express from 'express';
import { 
  getAllLogs, 
  getUserLogs, 
  getLogsByAction
} from '../controllers/logController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Get all logs (Admin only)
router.get('/', getAllLogs);

// Get logs by action type
router.get('/action/:action', getLogsByAction);

// Get logs for specific user
router.get('/user/:userId', getUserLogs);

export default router;