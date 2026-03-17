import mongoose, { Schema, Document } from 'mongoose';

export interface IPerformanceClientDetail extends Document {
  client_id: mongoose.Types.ObjectId;
  year_month: string;   // "YYYY-MM" (e.g. "2026-01")

  // optional month snapshot info
  date?: string | null;        // 👈 legacy index ke liye
  start_date?: string | null;  // "YYYY-MM-DD"
  end_date?: string | null;    // "YYYY-MM-DD"

  data: {
    meta_response?: any;
    adword_response?: any;
    shopify_response?: any;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const PerformanceClientDetailSchema = new Schema<IPerformanceClientDetail>(
  {
    client_id: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true
    },

    // Monthly key (YYYY-MM)
    year_month: {
      type: String,
      required: true
    },

    // LEGACY: for old unique index client_id_1_date_1
    date: {
      type: String,
      default: null
    },

    // NEW: store the exact range this snapshot covers
    start_date: {
      type: String,   // e.g. "2026-01-01"
      default: null
    },
    end_date: {
      type: String,   // e.g. "2026-01-31"
      default: null
    },

    // All responses nested under "data"
    data: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'performance_report',
    versionKey: false
  }
);

// Unique document per client + month
PerformanceClientDetailSchema.index(
  { client_id: 1, year_month: 1 },
  { unique: true }
);

// DB me existing index ke saath align:
PerformanceClientDetailSchema.index(
  { client_id: 1, date: 1 },
  { unique: true }
);


const PerformanceClientDetail = mongoose.model<IPerformanceClientDetail>(
  'PerformanceClientDetail',
  PerformanceClientDetailSchema
);

export default PerformanceClientDetail;