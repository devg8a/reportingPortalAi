import express from 'express';
import {
  getAllHolidays,
  createHoliday,
  getHolidayById,
  updateHoliday,
  deleteHoliday
} from '../controllers/holidayController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', getAllHolidays);

router.get('/:holidayId', authMiddleware, getHolidayById);

router.post('/', authMiddleware, createHoliday);

router.put('/:holidayId', authMiddleware, updateHoliday);

router.delete('/:holidayId', authMiddleware, deleteHoliday);

export default router;