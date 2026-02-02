import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
  },
  description: {
    type: String,
  },
  permissions: {
    type: Map,
    of: new mongoose.Schema({
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
    }),
    default: {}
  }
}, {
  timestamps: true,
  versionKey: false
});

const Role = mongoose.model('Role', roleSchema);
export default Role;