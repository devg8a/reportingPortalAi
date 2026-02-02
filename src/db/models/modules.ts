import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  access: {
    type: Boolean,
  },
  actions: [{
    type: String,
  }],
  client_scope: {
    type: String,
  },
  refresh: {
    type: Boolean,
  }
}, { _id: false });

const subModuleSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  module_name: {
    type: String,
    required: true
  },
  url: {
    type: String
  },
  permissions: {
    type: permissionSchema
  },
  sub_modules: [{
    type: mongoose.Schema.Types.Mixed
  }]
}, { _id: true });

const moduleSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  module_name: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String
  },
  permissions: {
    type: permissionSchema,
    default: null  
  },
  sub_modules: [subModuleSchema],
  is_parent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  versionKey: false
});

const Module = mongoose.model('Module', moduleSchema);
export default Module;