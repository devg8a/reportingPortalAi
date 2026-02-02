import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'permission_change', 'role_update', 'user_create', 'user_update','otp_resend', 'two_step_toggle','user_deleted','user_role_change','user_overrides_update']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
},{
    timestamps: true,
    versionKey: false,
});

const Log = mongoose.model('Log', logSchema);
export default Log;