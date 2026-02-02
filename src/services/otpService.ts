import crypto from 'crypto';
import AuthToken from '../db/models/forgotPasswordToken';
import { sendOTPEmail } from './emailService';

export const generateOTP = () => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

export const createOTP = async (email, purpose = 'login') => {
  try {
    // Delete any existing OTP for this email and purpose
    await AuthToken.deleteMany({ 
      email, 
      purpose 
    });

    const otp = generateOTP();
    const temp_token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otpRecord = new AuthToken({
      email,
      otp,
      token: otp,
      temp_token,
      purpose,
      expires_at,
    });

    await otpRecord.save();

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      console.log('Email sent successfully to:', email);
    } else {
      console.log('Email failed to send for:', email);
      console.log('OTP for manual use:', otp);
    }

    return {
      success: true,
      temp_token,
      message: emailSent ? 'OTP sent to your email' : 'OTP created. Check console for OTP.',
      otp_display: emailSent ? null : otp 
    };
  } catch (error) {
    console.error('Error creating OTP:', error);
    return {
      success: false,
      message: 'Failed to create OTP',
      error: error.message
    };
  }
};

export const verifyOTP = async (temp_token, otp) => {
  try {
    const otpRecord = await AuthToken.findOne({ 
      temp_token, 
      purpose: { $in: ['login', 'verify_email'] } 
    });

    if (!otpRecord) {
      return { success: false, message: 'OTP is invalid or has expired.' };
    }

    if (otpRecord.verified) {
      return { success: false, message: 'OTP already used' };
    }

    if (otpRecord.expires_at < new Date()) {
      return { success: false, message: 'OTP expired' };
    }

    if (otpRecord.otp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return {
      success: true,
      email: otpRecord.email,
      purpose: otpRecord.purpose,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'Error verifying OTP' };
  }
};