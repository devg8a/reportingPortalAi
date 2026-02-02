import { getMongoDbObjectId } from "../../helper/helper";
import { getCentralStorageModel } from "./dynamic-central-model";


export async function captureToCentralStorage(
    records: any,
    clientId: string,
    connectionId: string,
    network: string
) {
    const bulkOpsByYear: any[] = [];

    Object.entries(records).forEach(([date, recordsByDate]) => {
        const dateObj = new Date(date);
        dateObj.setUTCHours(0, 0, 0, 0);
        const year = dateObj.getUTCFullYear();

        if (!bulkOpsByYear[year]) {
            bulkOpsByYear[year] = [];
        }

        bulkOpsByYear[year].push({
            updateOne: {
                filter: {
                    client_id: getMongoDbObjectId(clientId),
                    connection_id: getMongoDbObjectId(connectionId),
                    network,
                    date: new Date(date),
                },
                update: {
                    $setOnInsert: {
                        client_id: getMongoDbObjectId(clientId),
                        connection_id: getMongoDbObjectId(connectionId),
                        network,
                        date: new Date(date),
                    },
                    $set: {
                        data: recordsByDate,
                    },
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
        } catch (err) {
            console.error(err);
        }
    }

    return true;
}
