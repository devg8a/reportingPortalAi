import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const clientContactsSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'client_details',
    required: true
  },
  is_main_contact: {
    type: Boolean,
    default: false
  },
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  is_invitation_sent: {
    type: String,
    default: 'pending'
  },
  status: {
    type: String,
    default: 'active'
  },
  email_notification_preference: {
    type: String,
    default: 'on'
  },
  overrides: {
    type: Map,
    of: new mongoose.Schema({
      access: {
        type: Boolean,
        required: false
      },
      actions: [{
        type: String,
        default: []
      }],
      client_scope: {
        type: String,
        required: false
      },
      refresh: {
        type: Boolean,
        required: false
      }
    }),
    default: {}
  }
}, {
  timestamps: true,
  versionKey: false
});

clientContactsSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log(error)
  }
});

clientContactsSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password compare error:', error);
    return false;
  }
};

export default mongoose.model('client_contacts', clientContactsSchema);