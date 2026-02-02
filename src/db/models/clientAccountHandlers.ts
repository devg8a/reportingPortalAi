import mongoose from 'mongoose';

const clientAccountHandlersSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'client_details',
    required: true,
    unique: true
  },
  am_id: [{
    type: String
  }],
  assoc_am_id: [{
    type: String
  }],
  past_am_id: [{
    type: String
  }],
  paid_social_id: [{
    type: String
  }],
  assoc_paid_social_id: [{
    type: String
  }],
  paid_search_id: [{
    type: String
  }],
  assoc_paid_search_id: [{
    type: String
  }],
  design_lead_id: [{
    type: String
  }],
  assoc_design_lead_id: [{
    type: String
  }],
  email_lead_id: [{
    type: String
  }],
  assoc_email_lead_id: [{
    type: String
  }],
  affiliate_lead_id: [{
    type: String
  }],
  assoc_affiliate_lead_id: [{
    type: String
  }],
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('client_account_handlers', clientAccountHandlersSchema);