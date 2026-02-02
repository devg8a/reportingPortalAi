import mongoose from 'mongoose';

const authTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
  },
  token: {
    type: String,
    required: true,
  },
  temp_token: {
    type: String,
    index: true
  },
  purpose: {
    type: String,
    enum: ['login', 'reset_password', 'verify_email'],
    default: 'login',
  },
  entity_type: {
    type: String,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
}, {
  timestamps: true,
  versionKey: false,
});

const AuthToken = mongoose.model('forgot_password_tokens', authTokenSchema);
export default AuthToken;
