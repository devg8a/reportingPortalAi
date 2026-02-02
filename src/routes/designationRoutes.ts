import express from 'express';
import { createDesignation, getAllDesignations } from '../controllers/designationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/',authMiddleware, getAllDesignations);

router.post('/', authMiddleware, createDesignation);

export default router;