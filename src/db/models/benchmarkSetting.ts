import mongoose from "mongoose";

const ClientSettingSchema = new mongoose.Schema(
  {
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client_details',
        required: true
      },
    date: {
      type: String,
      required: true,
    },

    benchmarks: {
      spend: {
        microdata: String,
        evergreen: String,
        promo1st: String,
        promo2nd: String,
      },
      cpoc: {
        microdata: String,
        evergreen: String,
        promo1st: String,
        promo2nd: String,
      },
      octr: {
        microdata: String,
        evergreen: String,
        promo1st: String,
        promo2nd: String,
      },
      roas: {
        microdata: String,
        evergreen: String,
        promo1st: String,
        promo2nd: String,
      },
      cpa: {
        microdata: String,
        evergreen: String,
        promo1st: String,
        promo2nd: String,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
export default mongoose.model('client_benchmark_setting', ClientSettingSchema);