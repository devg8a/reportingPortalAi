import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  profile_pic: {  
    type: String,
    default: null
  },
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
  },
  user_type: {
    type: String,
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role is required'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  location: {
    type: String,
    default: 'in',
  },
  employee_portfolio: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  two_step_enabled: {
    type: Boolean,
    default: false,
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

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log(error)
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password compare error:', error);
    return false;
  }
};

const User = mongoose.model('User', userSchema);
export default User;