import mongoose, { Schema } from 'mongoose';

const clientVisibilitySchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    module_key: {
        type: String,
        required: true
    },

    // Optional
    client_ids: [{
        type: Schema.Types.ObjectId,
        ref: 'client_details'
    }],

    // Optional
    preferences: {
        type: Schema.Types.Mixed
    }

}, {
    timestamps: true,
    versionKey: false
});

clientVisibilitySchema.index({ user_id: 1, module_key: 1 }, { unique: true });

const ClientVisibility = mongoose.model('client_visibility', clientVisibilitySchema);

export default ClientVisibility;