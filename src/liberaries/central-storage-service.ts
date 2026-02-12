import { getCentralStorageModel } from "../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../helper/helper";
import logger from '../utils/logger';

async function captureToCentralStorage(records, clientId, connectionId, network) {
    const bulkOpsByYear: any[] = [];

    Object.entries(records).forEach(([date, recordsByDate]) => {

      const dateObj = new Date(date);
      dateObj.setUTCHours(0, 0, 0, 0);
      const year = dateObj.getUTCFullYear();

      if (!bulkOpsByYear[year]) {
        bulkOpsByYear[year] = [];
      }

      const setObj: Record<string, unknown> = {};
      const dataRecord = recordsByDate as Record<string, unknown>;
      for (const [key, value] of Object.entries(dataRecord)) {
        if (Array.isArray(value) && value.length > 0) {
          setObj[`data.${key}`] = value;
        }
      }

      if (Object.keys(setObj).length === 0) {
        return;
      }

      bulkOpsByYear[year].push({
        updateOne: {
          filter: {
            client_id: getMongoDbObjectId(clientId),
            connection_id: getMongoDbObjectId(connectionId),
            network: network,
            date: new Date(date),
          },
          update: {
            $setOnInsert: {
              client_id: getMongoDbObjectId(clientId),
              connection_id: getMongoDbObjectId(connectionId),
              network: network,
              date: new Date(date),
            },
            $set: setObj,
          },
          upsert: true,
        },
      });
    });

    // Execute bulkWrite per year
    for (const [year, bulkOps] of Object.entries(bulkOpsByYear)) {
      if (!bulkOps.length) continue;

      const modelName = getCentralStorageModel(`central_storage_${year}`);
      try {
        await modelName.bulkWrite(bulkOps, { ordered: false });
      } catch (err: any) {
        if (err.mongoose?.validationErrors) {
          err.mongoose.validationErrors.forEach((e: any, index: number) => {
            logger.error(e.message, "Adword Error Message:");
          });
        } else {
          logger.error(err, "Adword Error: ");
        }
      }

    }
    return true;
  }

export default captureToCentralStorage;
