import mongoose, { Schema } from "mongoose";

const FileSchema = new Schema({
    name: String,
    type: String,
    data: String
});

const ApprovalActivityLogsSchema = new Schema({


    client_id: {
        type: Schema.Types.ObjectId,
        required: true
    },

    connection_id: {
        type: Schema.Types.ObjectId,
        required: true
    },
    campaign_id: {
        type: Schema.Types.ObjectId,
        required: true
    },

    send_by: {
        type: String,
        enum: ["user", "client"],
        required: true
    },

    user_id: {
        type: Schema.Types.ObjectId,
        required: true
    },

    module: {
        type: String, // module_key
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    comment: {
        type: String
    },

    files: [FileSchema], // multiple files



}, {
    timestamps: true,
    versionKey: false,
});

export default mongoose.model(
    "approval_activity_logs",
    ApprovalActivityLogsSchema
);