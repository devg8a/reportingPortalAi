import express from 'express';
const router = express.Router();
import multer from 'multer';
import { body } from 'express-validator';
import {
  addUser,
  updateUserProfile,
  toggleTwoStepVerification,
  getAllUsers,
  getUserById,
  deleteUserPermanently,
  updateUserOverrides
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage })
// Get all users (Admin only)
router.get('/',
  authMiddleware,
   getAllUsers);

// Get user by ID
router.get('/:userId',authMiddleware, getUserById);

// Add new user (Admin only)
router.post(
  '/',
  authMiddleware,
  upload.single('profile_pic'),
  [
    body('first_name').notEmpty().trim(),
    body('last_name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    body('role_id').notEmpty(),
  ],
  addUser
);

// Delete user permanently (Admin only)
router.delete('/:userId', authMiddleware, deleteUserPermanently);
// Update user profile
router.put('/:userId', authMiddleware, upload.single('profile_pic'), updateUserProfile);

// Toggle two-step verification (Admin only)
router.patch(
  '/:userId/two-step',
  authMiddleware,
  [
    body('enabled').isBoolean(),
  ],
  toggleTwoStepVerification
);
router.put('/:userId/overrides', authMiddleware, updateUserOverrides);

export default router;