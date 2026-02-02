import mongoose from "mongoose";
import { storageSchema } from "./centralStorage-schema";

/**
 * Returns a model bound to a dynamic collection
 */
export const getCentralStorageModel = (collectionName: string) => {
  // Prevent model overwrite error
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  return mongoose.model(
    collectionName,
    storageSchema,
    collectionName //actual collection name
  );
};
