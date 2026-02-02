import express from 'express';
import {
  createClientSetting,
  // updateClientSetting,
  getClientSetting,
} from '../controllers/benchmarkSettingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/client-settings', authMiddleware, createClientSetting);
// router.put('/client-settings/:settingId', authMiddleware, updateClientSetting);
router.get('/client-settings/:settingId', getClientSetting);


export default router;