import * as apiClient from './cj-client';
import groupDayWiseTransactionData from "./cj-utils";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";

export class CjService{
    /**
     * documentation url: https://developers.cj.com/graphql/reference/Commission%20Detail
     */
    
    async transactionList(requestData) {
        const url = `https://commissions.api.cj.com/query`;
        const response = await apiClient.triggerApi(url,requestData);
        if (response?.status !== 200) {
            return response;
        }else{
            const structuredTransactionData = await groupDayWiseTransactionData(response?.data); 
            this.captureToCentralStorage(structuredTransactionData,requestData?.clientId);
            return structuredTransactionData;
        }
    }

    async captureToCentralStorage(records,clientId){
            const bulkOpsByYear: any[] = [];
    
            Object.entries(records).forEach(([transactionDate, recordsByDate]) => {
    
                const dateObj = new Date(transactionDate);
                dateObj.setUTCHours(0, 0, 0, 0);
                const year = dateObj.getUTCFullYear();
    
                if (!bulkOpsByYear[year]) {
                  bulkOpsByYear[year] = [];
                } 
    
                bulkOpsByYear[year].push({
                    updateOne: {
                        filter: {
                          client_id: getMongoDbObjectId(clientId),
                          network: 'cj',
                          date: transactionDate,
                        },
                        update:{
                            $setOnInsert: {
                                client_id : getMongoDbObjectId(clientId),
                                network   : 'cj',
                                date      : transactionDate,
                                created_at: new Date(),
                            },
                            $set: {
                                transaction_data: recordsByDate,
                                updated_at: new Date(),
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
                } catch (err: any) {
                  if (err.mongoose?.validationErrors) {
                    err.mongoose.validationErrors.forEach((e: any, index: number) => {
                      console.error("Error Message:", e.message);
                    });
                  } else {
                    console.error(err);
                  }
                }
    
            }
            return true;
        }
}