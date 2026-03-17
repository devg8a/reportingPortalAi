import mongoose from "mongoose";

export const storageSchema = new mongoose.Schema(
  {
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientDetails', required: true },
    connection_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientConnections', required: true },
    network: { type: String, required: true },
    date: { 
      type: Date,
      required: true,
      get: (val) => {
        if (!val) return val;
        return val.toISOString().split("T")[0];
      }
    },
    data: { type: Object },
  },
  {
    versionKey: false,
    timestamps: true,
    toJSON: { getters: true }, 
    toObject: { getters: true }
  }
);

/** Critical for upserts */
storageSchema.index(
  { client_id: 1, network: 1, connection_id: 1, date: 1 },
  { unique: true }
);

/** Optimization Index for Date-Range Queries */
storageSchema.index({ client_id: 1, date: 1 });