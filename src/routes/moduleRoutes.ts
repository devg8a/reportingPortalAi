import express from 'express';
const router = express.Router();
import {
    getAllModules,
    getModulesById,
    createModules,
    updateModule,
    deleteModule
} from '../controllers/modulesController';
import { authMiddleware } from '../middleware/authMiddleware';

router.get('/', getAllModules);
router.get('/:id', getModulesById);
router.post('/add-modules', createModules);
router.put('/:id', authMiddleware, updateModule);
router.delete('/:id', authMiddleware, deleteModule);

export default router;