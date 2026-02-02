import mongoose, { Document, Schema } from 'mongoose';

export interface IAccountSummary extends Document {
    client_id: mongoose.Types.ObjectId;
    client_name?: string;
    date: string;
    fetched_at: Date;
    raw: {
        shopify: any;
        ga: any;
        meta: any;
        adword: any;
    };
    updated_at: Date;
}

const AccountSummarySchema: Schema = new Schema({
    client_id: {
        type: Schema.Types.ObjectId,
        ref: 'client_details',
        required: true
    },
    client_name: {
        type: String
    },
    date: {
        type: String,
        required: true
    },
    fetched_at: {
        type: Date,
        default: Date.now
    },
    raw: {
        shopify: { type: Schema.Types.Mixed, default: null },
        ga: { type: Schema.Types.Mixed, default: null },
        meta: { type: Schema.Types.Mixed, default: null },
        adword: { type: Schema.Types.Mixed, default: null }
    },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

AccountSummarySchema.index({ client_id: 1, date: 1 }, { unique: true });
AccountSummarySchema.index({ date: 1 });
AccountSummarySchema.index({ client_id: 1 });

export default mongoose.model<IAccountSummary>('account_summaries', AccountSummarySchema, 'account_summaries');