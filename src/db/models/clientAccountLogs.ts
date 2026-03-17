import mongoose from 'mongoose';

const clientAccountLogsSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'client_details'
  },
  am_id: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assoc_am_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  paid_social_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  assoc_paid_social_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  paid_search_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  assoc_paid_search_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  design_lead_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  assoc_design_lead_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  email_lead_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  assoc_email_lead_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  affiliate_lead_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  assoc_affiliate_lead_id: [{
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
  }],
  type: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted']
  },
}, {
  timestamps: true,
  versionKey: false,
});


export default mongoose.model('client_account_logs', clientAccountLogsSchema);