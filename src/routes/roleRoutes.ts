import express from 'express';
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole
} from '../controllers/roleController.js';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// GET routes
router.get('/',authMiddleware, getAllRoles);
router.get('/:roleId',authMiddleware, getRoleById);

// POST routes
router.post('/add-role',authMiddleware, createRole);

// PUT routes
router.put('/:roleId',authMiddleware, updateRole);

// DELETE routes
router.delete('/:roleId',authMiddleware, deleteRole);

export default router;