import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getChangeLogs,
  resetPasswordAndSendLogin,
  deleteContact,
} from '../controllers/clientController';
import { authMiddleware } from '../middleware/authMiddleware';
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });
const router = express.Router();

// Get all clients
router.get('/list',
  authMiddleware,
   getClients);

// Get client by ID
router.get('/:clientId',
  authMiddleware, 
  getClientById);

// Create new client (complete with all collections)
router.post(
  '/',
  // authMiddleware,
  upload.single('profile_pic'),
  createClient
);

// Update client details
router.put('/:clientId', 
  // authMiddleware,
  upload.single('profile_pic'), updateClient);

// Reset password and send login info
router.post('/contacts/:contactId/reset-password'
  // ,authMiddleware
, resetPasswordAndSendLogin);

// Delete client (Temporary delete)
router.delete('/:clientId'
  // ,authMiddleware
  , deleteClient);

// Get change logs by date
router.get('/logs/change-logs', getChangeLogs);

// Delete contact
router.delete('/contacts/:contactId'
  // ,authMiddleware
  , deleteContact);

export default router;