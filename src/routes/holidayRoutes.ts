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

router.get('/:holidayId', getHolidayById);

router.post('/',  createHoliday);

router.put('/:holidayId', updateHoliday);

router.delete('/:holidayId', deleteHoliday);

export default router;