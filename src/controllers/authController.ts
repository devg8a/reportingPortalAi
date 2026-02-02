import User from '../db/models/user';
import ClientContacts from '../db/models/clientContacts';
import jwt from 'jsonwebtoken';
import { createOTP, verifyOTP } from '../services/otpService';
import { createLog } from '../services/logService';
import ForgotPasswordToken from '../db/models/forgotPasswordToken';
import { sendPasswordResetEmail } from '../services/emailService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getFinalPermissions, getClientPermissions } from '../services/permissionUtils';
import Role from '../db/models/role';

import ClientDetails from '../db/models/clientDetails';

export const loginStep1 = async (req, res) => {
  try {
    const { email, password, login_as } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status_code: 400,
        success    : false,
        message    : 'Email and password are required',
        data       : null
      });
    }

    // Check if email exists in both collections
    const userExists   = await User.findOne({ email });
    const clientExists = await ClientContacts.findOne({ email });

    // Determine login entity based on existence
    let loginEntity;
    let entityType: 'user' | 'client';


    if (userExists && clientExists) {
      if (login_as === 'client') {
        loginEntity = clientExists;
        entityType  = 'client';
      } else if (login_as === 'user') {
        loginEntity = userExists;
        entityType  = 'user';
      } else {
        return res.status(200).json({
          status_code: 200,
          success: true,
          message: 'Email found in both User and Client accounts',
          data: {
            requires_selection: true,
            options: {
              as_user: true,
              as_client: true
            },
            email: email
          }
        });
      }
    }
    else if (clientExists && !userExists) {
      loginEntity = clientExists;
      entityType  = 'client';
    }
    else if (userExists && !clientExists) {
      loginEntity = userExists;
      entityType  = 'user';
    }
    else {
      return res.status(422).json({
        status_code: 422,
        success    : false,
        message    : 'Please try again with the correct email.',
        data       : null
      });
    }

    if (loginEntity.status !== 'active') {
      return res.status(422).json({
        status_code: 422,
        success    : false,
        message    : 'Account is inactive. Please contact Admin.',
        data       : null
      });
    }

    const isPasswordValid = await (loginEntity as any).comparePassword(password);
    if (!isPasswordValid) {
      return res.status(422).json({
        status_code: 422,
        success    : false,
        message    : 'Please try again or reset your password if you’ve forgotten it.',
        data       : null
      });
    }

    if (entityType === 'user' && loginEntity.two_step_enabled) {
      const otpResult = await createOTP(email, 'login');

      if (!otpResult.success) {
        return res.status(422).json({
          status_code: 422,
          success    : false,
          message    : 'Failed to send OTP',
          data       : null
        });
      }

      return res.status(200).json({
        status_code: 200,
        success    : true,
        message    : otpResult.message,
        data: {
          temp_token   : otpResult.temp_token,
          requires_otp : true,
          entity_type  : entityType,
          user_id      : loginEntity._id
        }
      });
    }

    let token;
    let permissions  = {};
    let responseData = {};

    if (entityType === 'user') {
      try {
        permissions = await getFinalPermissions(loginEntity._id);
      } catch (error) {
        console.error('Permission building error:', error);
        permissions = {};
      }

      token = jwt.sign(
        {
          user_id    : loginEntity._id,
          email      : loginEntity.email,
          entity_type: 'user',
          role       : loginEntity.role_id,
          permissions: permissions,
          login_time : new Date(),
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      const roleName = await Role.findById(loginEntity.role_id);
      responseData = {
        id         : loginEntity._id,
        first_name : loginEntity.first_name,
        last_name  : loginEntity.last_name,
        email      : loginEntity.email,
        role: {
          role_id: loginEntity.role_id,
          name: roleName?.name,
        },
        two_step_enabled : loginEntity.two_step_enabled,
        overrides        : loginEntity.overrides || {}
      };
    } else {
      try {
        permissions = await getClientPermissions(loginEntity._id);
      } catch (error) {
        console.error('Client permission building error:', error);
        permissions = {};
      }

      token = jwt.sign(
        {
          client_contact_id : loginEntity._id,
          client_id         : loginEntity.client_id,
          email             : loginEntity.email,
          entity_type       : 'client',
          permissions       : permissions,
          login_time        : new Date(),
        },
        process.env.JWT_SECRET,
        { expiresIn : process.env.JWT_EXPIRES_IN }
      );

      const clientDetails = await ClientDetails.findById(loginEntity.client_id).select('-dashboardStats');
      responseData = {
        id              : loginEntity._id,
        first_name      : loginEntity.first_name,
        last_name       : loginEntity.last_name,
        email           : loginEntity.email,
        entity_type     : 'client',
        is_main_contact : loginEntity.is_main_contact,
        client_details  : clientDetails,
        overrides       : loginEntity.overrides || {}
      };
    }

    await createLog(loginEntity._id, 'login', {
      email            : loginEntity.email,
      entity_type      : entityType,
      two_step_enabled : entityType === 'user' ? loginEntity.two_step_enabled : false,
      status           : 'success'
    }, req);

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : 'Login successful',
      data: {
        token,
        user: responseData,
        permissions: permissions,
        entity_type: entityType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : null
    });
  }
};

export const verifyLoginOTP = async (req, res) => {
  try {
    const { temp_token, otp, entity_type, user_id } = req.body;

    if (!temp_token || !otp) {
      return res.status(400).json({
        status_code: 400,
        success    : false,
        message    : 'Temp token and OTP are required',
        data       : null
      });
    }

    // Verify OTP
    const otpResult = await verifyOTP(temp_token, otp);
    if (!otpResult.success) {
      return res.status(422).json({
        status_code: 422,
        success    : false,
        message    : otpResult.message,
        data       : null
      });
    }

    // Determine entity type based on actual database entry
    let loginEntity;
    let actualEntityType: 'user' | 'client';
    loginEntity = await User.findOne({ email: otpResult.email });
    if (loginEntity) {
      actualEntityType = 'user';
    } else {
      loginEntity = await ClientContacts.findOne({ email: otpResult.email });
      if (loginEntity) {
        actualEntityType = 'client';
      } else {
        return res.status(422).json({
          status_code: 422,
          success    : false,
          message    : 'Account not found',
          data       : null
        });
      }
    }
    let token;
    let permissions = {};
    let userData    = {};
    if (actualEntityType === 'user') {
      // User login with OTP - get permissions using new method
      try {
        permissions = await getFinalPermissions(loginEntity._id);
      } catch (error) {
        console.error('Permission building error:', error);
        permissions = {};
      }

      token = jwt.sign(
        {
          user_id     : loginEntity._id,
          email       : loginEntity.email,
          entity_type : 'user',
          role        : loginEntity.role_id,
          permissions : permissions,
          login_time  : new Date(),
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      const roleName = await Role.findById(loginEntity.role_id);
      userData = {
        id         : loginEntity._id,
        first_name : loginEntity.first_name,
        last_name  : loginEntity.last_name,
        email      : loginEntity.email,
        role: {
          role_id : loginEntity.role_id,
          name    : roleName?.name,
        },
        two_step_enabled : loginEntity.two_step_enabled,
        overrides        : loginEntity.overrides || {}
      };
    } else {
      // Client login with OTP - use overrides as permissions
      try {
        permissions = await getClientPermissions(loginEntity._id);
      } catch (error) {
        console.error('Client permission building error:', error);
        permissions = {};
      }

      token = jwt.sign(
        {
          client_contact_id : loginEntity._id,
          client_id         : loginEntity.client_id,
          email             : loginEntity.email,
          entity_type       : 'client',
          permissions       : permissions,
          login_time        : new Date(),
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      const clientDetails = await ClientDetails.findById(loginEntity.client_id).select('-dashboardStats');
      userData = {
        id              : loginEntity._id,
        first_name      : loginEntity.first_name,
        last_name       : loginEntity.last_name,
        email           : loginEntity.email,
        entity_type     : 'client',
        is_main_contact : loginEntity.is_main_contact,
        client_details  : clientDetails,
        overrides       : loginEntity.overrides || {}
      };
    }

    // Log OTP verified login
    await createLog(loginEntity._id, 'login', {
      email       : loginEntity.email,
      method      : 'otp_verified',
      entity_type : actualEntityType,
      status      : 'success'
    }, req);

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : 'Login successful',
      data: {
        token,
        user: userData,
        permissions: permissions,
        entity_type: actualEntityType
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      status_code: 500,
      success    : false,
      message    : 'Internal server error',
      data       : null
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(422).json({
        status_code: 422,
        success    : false,
        message    : 'Unauthenticated: Authentication required',
        data       : null
      });
    }

    let responseData;
    let permissions = {};

    if (req.user.entity_type === 'user') {
      const user = await User.findById(req.user.user_id)
        .select('-password')
        .populate('role_id', 'name permissions');

      if (!user) {
        return res.status(422).json({
          status_code : 422,
          success     : false,
          message     : 'User not found',
          data        : null
        });
      }

      permissions = await getFinalPermissions(req.user.user_id);

      responseData = {
        ...user.toObject(),
        permissions: permissions,
        overrides: user.overrides || {},
        entity_type: 'user'
      };
    } else {
      const clientContact = await ClientContacts.findById(req.user.client_contact_id)
        .select('-password');

      if (!clientContact) {
        return res.status(422).json({
          status_code : 422,
          success     : false,
          message     : 'Client contact not found',
          data        : null
        });
      }

      permissions = clientContact.overrides || {};

      const clientDetails = await ClientDetails.findById(clientContact.client_id);

      responseData = {
        ...clientContact.toObject(),
        client_details : clientDetails,
        permissions    : permissions,
        overrides      : clientContact.overrides || {},
        entity_type    : 'client'
      };
    }

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : 'User data has been fetched successfully',
      data        : responseData
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : error
    });
  }
};

// Forgot Password - Request reset link
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Email is required',
        data        : null
      });
    }

    // Check if email exists in User and ClientContacts collection
    const user = await User.findOne({ email });
    const client = await ClientContacts.findOne({ email });

    // If email doesn't exist in either collection
    if (!user && !client) {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'No account found with this email',
        data        : null
      });
    }

    // Determine entity type
    let entityType = '';
    let userId     = null;

    if (user) {
      entityType = 'user';
      userId     = user._id;
    } else {
      entityType = 'client';
      userId     = client._id;
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiry to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing tokens for this email
    await ForgotPasswordToken.deleteMany({
      email,
      entity_type: entityType,
      purpose    : 'reset_password'
    });

    // Save new token
    const forgotToken = new ForgotPasswordToken({
      email,
      token,
      entity_type: entityType,
      user_id: userId,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
      purpose: 'reset_password'
    });

    await forgotToken.save();

    // Generate reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // Send email
    const emailSent = await sendPasswordResetEmail(email, resetLink);

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : emailSent
        ? 'We’ve sent a password reset link to your email address.'
        : 'Failed to send email, but reset link generated',
      data: {
        token: process.env.NODE_ENV !== 'production' ? token : token,
        email_sent: emailSent
      }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : null
    });
  }
};

// Verify Reset Token - Verify token validity
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Token is required',
        data        : null
      });
    }

    // Find token in database
    const resetToken = await ForgotPasswordToken.findOne({
      token,
      purpose: 'reset_password'
    });

    if (!resetToken) {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Invalid or expired reset token',
        data        : null
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expires_at) {
      await ForgotPasswordToken.deleteOne({ token, purpose: 'reset_password' });
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Reset token has expired',
        data        : null
      });
    }

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : 'Token is valid',
      data: {
        email: resetToken.email,
        entity_type: resetToken.entity_type
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : null
    });
  }
};

// Reset Password - Set new password
export const resetPassword = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Request body is missing',
        data        : null
      });
    }

    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Token, new password, and confirm password are required',
        data        : null
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Passwords do not match',
        data        : null
      });
    }

    // Find token
    const resetToken = await ForgotPasswordToken.findOne({
      token,
      purpose: 'reset_password'
    });

    if (!resetToken) {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Invalid or expired reset token',
        data        : null
      });
    }

    // Check if token is expired
    if (new Date() > resetToken.expires_at) {
      await ForgotPasswordToken.deleteOne({ token, purpose: 'reset_password' });
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Reset token has expired',
        data        : null
      });
    }
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password based on entity type
    if (resetToken.entity_type === 'user') {
      await User.findByIdAndUpdate(resetToken.user_id, {
        password: hashedPassword
      });
    } else {
      await ClientContacts.findByIdAndUpdate(resetToken.user_id, {
        password: hashedPassword
      });
    }

    // Delete the used token
    await ForgotPasswordToken.deleteOne({ token, purpose: 'reset_password' });

    // Create log
    await createLog(resetToken.user_id, 'password_reset', {
      email       : resetToken.email,
      entity_type : resetToken.entity_type,
      status      : 'success'
    }, req);

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : 'You can now log in with your new password.',
      data: {
        redirect_to: '/login'
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : null
    });
  }
};

// Password Check - for frontend validation
export const checkPasswordStrength = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Password is required',
        data        : null
      });
    }

    const checks = {
      length: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const isStrong = Object.values(checks).every(Boolean);

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : isStrong ? 'Password is strong' : 'Password strength check completed',
      data: {
        is_strong: isStrong,
        checks,
        suggestions: !isStrong ? [
          !checks.length && 'Password must be at least 8 characters long',
          !checks.hasUppercase && 'Include at least one uppercase letter',
          !checks.hasLowercase && 'Include at least one lowercase letter',
          !checks.hasNumber && 'Include at least one number',
          !checks.hasSpecialChar && 'Include at least one special character'
        ].filter(Boolean) : []
      }
    });

  } catch (error) {
    console.error('Password check error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : null
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { temp_token, email, entity_type, user_id } = req.body;

    // Check if either temp_token or email is provided
    if (!temp_token && !email) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Either temp_token or email is required',
        data        : null
      });
    }

    let targetEmail = email;

    // If temp_token is provided, decode it to get the email
    if (temp_token && !email) {
      try {
        // Decode the JWT token to get the email
        const decoded: any = jwt.verify(temp_token, process.env.JWT_SECRET || '');
        targetEmail = decoded.email;
      } catch (error) {
        return res.status(422).json({
          status_code : 422,
          success     : false,
          message     : 'Invalid or expired temp token',
          data        : null
        });
      }
    }

    // Check if email exists in database
    if (!targetEmail) {
      return res.status(400).json({
        status_code : 400,
        success     : false,
        message     : 'Email is required',
        data        : null
      });
    }

    // Check if the user exists and is active
    const user = await User.findOne({ email: targetEmail });
    const client = await ClientContacts.findOne({ email: targetEmail });

    if (!user && !client) {
      return res.status(422).json({
        status_code : 404,
        success     : false,
        message     : 'Account not found',
        data        : null
      });
    }

    // Determine entity type if not provided
    let actualEntityType = entity_type;
    if (!actualEntityType) {
      actualEntityType = user ? 'user' : 'client';
    }

    const loginEntity = user || client;

    // Check if account is active
    if (loginEntity.status !== 'active') {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Account is inactive',
        data        : null
      });
    }

    // Check if user has two-step enabled (only for users)
    if (actualEntityType === 'user' && !user?.two_step_enabled) {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Two-step verification is not enabled for this account',
        data        : null
      });
    }
    // Create and send new OTP
    const otpResult = await createOTP(targetEmail, 'login');

    if (!otpResult.success) {
      return res.status(422).json({
        status_code : 422,
        success     : false,
        message     : 'Failed to send OTP. Please try again.',
        data        : null
      });
    }

    // Log the OTP resend event
    await createLog(loginEntity._id, 'otp_resend', {
      email       : targetEmail,
      entity_type : actualEntityType,
      status      : 'success'
    }, req);

    return res.status(200).json({
      status_code : 200,
      success     : true,
      message     : 'OTP has been resent successfully',
      data: {
        temp_token: otpResult.temp_token,
        requires_otp: true,
        entity_type: actualEntityType,
        user_id: loginEntity._id,
        email: targetEmail
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      status_code : 500,
      success     : false,
      message     : 'Internal server error',
      data        : null
    });
  }
};