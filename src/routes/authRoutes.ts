import express from 'express';
const router = express.Router();
import { body } from 'express-validator';
import {
  loginStep1,
  verifyLoginOTP,
  getCurrentUser,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  checkPasswordStrength,
  resendOTP 
} from '../controllers/authController';

// Login (Step 1)
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  loginStep1
);

// Verify OTP (Step 2)
router.post(
  '/verify-otp',
  [
    body('temp_token').notEmpty(),
    body('otp').isLength({ min: 6, max: 6 }),
  ],
  verifyLoginOTP
);

// Get current user
router.get('/me', getCurrentUser);

// forgot password routes
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  forgotPassword
);

router.get('/verify-reset-token', verifyResetToken);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required')
  ],
  resetPassword
);
// resend Otp
router.post(
  '/resend-otp',
  resendOTP
);
// Password strength check
router.post('/check-password', checkPasswordStrength);

export default router;