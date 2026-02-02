import express from 'express';
const router = express.Router();
import { body } from 'express-validator';

import {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient
} from '../controllers/clientIcpController';
import { authMiddleware } from'../middleware/authMiddleware';

// Get all clients
router.get('/', getAllClients);

// Get client by ID
router.get('/:clientId', getClientById);

// Create new client
router.post(
  '/',
  authMiddleware,
  [
    body('client_id').notEmpty().withMessage('Client ID is required'),
    body('monday_id').notEmpty().withMessage('Monday ID is required'),
    body('name').notEmpty().withMessage('Client name is required'),
    body('start_date').notEmpty().withMessage('Start date is required')
  ],
  createClient
);

// Update client
router.put('/:clientId', authMiddleware, updateClient);

// Delete client
router.delete('/:clientId', authMiddleware, deleteClient);

export default router;