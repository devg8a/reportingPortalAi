import express from 'express';
import * as utilityController from '../controllers/utilityController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Client utility routes
router.get('/clients/active', authMiddleware, utilityController.getActiveClients);
router.get('/clients/:id', authMiddleware, utilityController.getClientById);
router.post('/clients/filter', authMiddleware, utilityController.getClientsByFilter);
router.post('/clients/visibility', authMiddleware, utilityController.updateClientVisibilityController);
router.get('/designationwise-user-list', utilityController.designationWiseUserList);


export default router;
