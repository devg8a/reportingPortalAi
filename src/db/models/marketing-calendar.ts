// db/schema/marketing-calendar.schema.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketingCalendar extends Document {
    client_id: mongoose.Types.ObjectId;
    connection_id: mongoose.Types.ObjectId;
    campaign_id: string;
    campaign_name: string;
    channel: 'email' | 'sms';
    status: string;
    type: 'draft' | 'proposal';
    send_time: Date;
    archived: boolean;


    name?: string;
    discountCode?: string;
    startDate?: Date;
    endDate?: Date;
    whoIsDesigning?: string;
    whoIsSending?: string;
    clientProvidingAssets?: boolean;
    assetUrl?: string;

    content?: {
        promotion?: string;
        themeSummary?: string;
        productFeatures?: string;
        landingPage?: string;
        additionalNotes?: string;
        description?: string;
    };


    audiences: {
        included: Record<string, { name: string | null; type: string | null }>;
        excluded: Record<string, { name: string | null; type: string | null }>;
    };

    message_id?: string;
    created_at: Date;
    updated_at: Date;
}

const MarketingCalendarSchema = new Schema<IMarketingCalendar>(
    {
        client_id: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        connection_id: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        campaign_id: {
            type: String,
            // required: true,
            unique: true,
            sparse: true

        },

        campaign_name: {
            type: String,
            required: true,
            sparse: true

        },

        channel: {
            type: String,
            enum: ['email', 'sms'],
            // required: true,
        },

        status: {
            type: String,
            required: true,
        },

        type: {
            type: String,
            required: true,
            enum: ['draft', 'proposal'],
        },

        send_time: {
            type: Date,
            // required: true,
            index: true,
        },

        archived: {
            type: Boolean,
            default: false,
        },

        discountCode: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        whoIsDesigning: { type: String },
        whoIsSending: { type: String },
        clientProvidingAssets: { type: Boolean, default: false },
        assetUrl: { type: String },

        content: {
            promotion: { type: String },
            themeSummary: { type: String },
            productFeatures: { type: String },
            landingPage: { type: String },
            additionalNotes: { type: String },
            description: { type: String }
        },

        audiences: {
            included: {
                type: Schema.Types.Mixed,
                default: {},
            },
            excluded: {
                type: Schema.Types.Mixed,
                default: {},
            },
        },

        message_id: {
            type: String,
        },

    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        versionKey: false,
    }
);

// Compound index
MarketingCalendarSchema.index({ client_id: 1, connection_id: 1, send_time: -1 });

export const MarketingCalendarModel = mongoose.model<IMarketingCalendar>(
    'marketing_calendar',
    MarketingCalendarSchema
);