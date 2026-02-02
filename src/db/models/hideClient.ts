import mongoose from 'mongoose';

const hideClientSchema = new mongoose.Schema({
    module_key: {
        type: String,
        required: true
    },
    client_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client_details',
        required: true
    }],
    hidden_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false,
});

const HideClient = mongoose.model("hide_clients", hideClientSchema);

export default HideClient;
