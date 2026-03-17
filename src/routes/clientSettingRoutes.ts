import express from 'express';
import {
  createClientSetting,
  updateClientSetting,
} from '../controllers/benchmarkSettingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/client-settings/:clientId', createClientSetting);
router.put('/client-settings/:settingId', updateClientSetting);


export default router;