import express from 'express';
import { getActiveClients, getClientById, getClientsByFilter } from '../controllers/utilityController';

const router = express.Router();

// Client utility routes
router.get('/clients/active', getActiveClients);
router.get('/clients/:id', getClientById);
router.post('/clients/filter', getClientsByFilter);

export default router;
