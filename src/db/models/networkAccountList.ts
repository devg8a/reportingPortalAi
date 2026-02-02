import mongoose from 'mongoose';

const networkAccountListSchema = new mongoose.Schema({
  network: {
    type: String,
    required: true
  },
  account_name: {
    type: String
  },
  account_id: {
    type: String,
    required: true
  },
  platform_type: {
    type: String,
  },
  status: {
    type: String,
    default: 'active'
  }
}, {
  timestamps: true,
  versionKey: false
});

networkAccountListSchema.index({ network: 1, account_id: 1 }, { unique: true });

export default mongoose.model('network_account_list', networkAccountListSchema);