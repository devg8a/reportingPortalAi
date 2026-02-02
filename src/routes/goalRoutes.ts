import express from 'express';
const router = express.Router();
import { syncAndSaveGoals, getGoalsData  } from '../controllers/goalController';

router.get('/', getGoalsData); 
router.post('/add-goals', syncAndSaveGoals); 

export default router
