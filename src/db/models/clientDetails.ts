import mongoose from 'mongoose';

const quickConfigurationSchema = new mongoose.Schema({
  first_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  display_name: {
    type: String,
  },
  company_name: {
    type: String,
  },
  email: {
    type: String,
  },
  internal_customer_notes: {
    type: String,
  },
  street_address_first: {
    type: String,
  },
  street_address_second: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  zipcode: {
    type: String,
  },
  country: {
    type: String,
  },
  payment: [{
    type: String,
  }]
}, {
  _id: false,
  versionKey: false
});

const performanceTrackingSchema = new mongoose.Schema({
  networks: {
    type: Map,
    of: Boolean,
    default: {}
  },
},
  {
    _id: false

  });

const settingSchema = new mongoose.Schema({
  combined_bench_mark: {
    type: Boolean,
    default: false,
  },
  include_cpaIn_ad_testing: {
    type: Boolean,
    default: false,
  },
  performance_tracking: {
    type: performanceTrackingSchema,
    default: () => ({})
  },
}, {
  _id: false
});

const clientDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: [{
    type: String,
    enum: ['paid_media', 'affiliate', 'aeo'],
    required: true
  }],
  is_main_account: {
    type: Boolean,
    default: false
  },
  main_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'client_details'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  monday_calender_id: {
    type: String
  },
  monday_board_id: {
    type: String
  },
  start_date: {
    type: Date,
  },
  termination_date: {
    type: Date
  },
  website_url: {
    type: String
  },
  profile_pic: {
    type: String
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  quickbook_configuration: {
    type: quickConfigurationSchema,
    default: () => ({})
  },
  setting: {
    type: settingSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  versionKey: false,
});

clientDetailsSchema.index({ status: 1, name: 1, type: 1 });
export default mongoose.model('client_details', clientDetailsSchema);