import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

/**
 * Sub-schema for Meta IDs
 */
const MetaIdsSchema = new Schema(
  {
    main_account: { type: String},
    nba: { type: String},
    nhl: { type: String},
    mlb: { type: String},
    nfl: { type: String},
  },
  { _id: false }
);

/**
 * Sub-schema for AdWords IDs
 */
const AdwordIdsSchema = new Schema(
  {
    ad_group_id   : { type: String},
    asset_group_id: { type: String},
  },
  { _id: false }
);

/**
 * Main PerformanceEntities Schema
 */
const PerformanceEntitiesSchema = new Schema(
  {
    client_id   : { type: Types.ObjectId,ref:'ClientDetails',required: [true, "Client ID is required."]},
    group_name  : { type: String, required: true},
    entity_name : { type: String, required: true},
    meta        : { type: MetaIdsSchema},
    adword      : { type: AdwordIdsSchema},
    status      : { type: String, enum: ['active', 'inactive'], default: 'active' }
    // adword_ids: {
    //   type: AdwordIdsSchema,
    //   default: () => ({}),
    // },
  },
  {
    collection : "performance_entites",
    timestamps : false, 
    versionKey: false
  }
);

PerformanceEntitiesSchema.index(
  { client_id: 1, group_name: 1, entity_name: 1 },
  { unique: true }
);

export default model("PerformanceEntities", PerformanceEntitiesSchema);
