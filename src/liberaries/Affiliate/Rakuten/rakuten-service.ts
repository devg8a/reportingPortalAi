import * as apiClient  from "./rakuten-client";
import { convertRakutenCSVToJSON }  from "./rakuten-utils";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";

export class RakutenService {

  /**Transaction List API**/
  async transactionList(requestData) {
    try {
      const url =
          `https://ran-reporting.rakutenmarketing.com/en/reports/` +
          `reporting-portal%3A-transaction/filters` +
          `?start_date=${requestData.startDate}` +
          `&end_date=${requestData.endDate}` +
          `&include_summary=Y&tz=GMT` +
          `&date_type=transaction&date_format=m/d/yy` +
          `&token=${requestData.authToken}`;
      const response = await apiClient.triggerApi(url);
      if (response.status !== 200) {
        return response;
      }else{
        const jsonResult = await convertRakutenCSVToJSON(response.data);
        this.captureToCentralStorage(jsonResult,requestData.clientId);
        return jsonResult;
      }
    } catch (error) {
      console.error("Third-party API error:", error);
      throw new Error("Failed to fetch transactions");
    }
  }

  /**Storage function to central-central in MongoDB**/
  async captureToCentralStorage(records,clientId){
    const bulkOpsByYear: any[] = [];

    for (const [transDate, transactions] of Object.entries(records)) {
        
        const dateObj = new Date(transDate);
        dateObj.setUTCHours(0, 0, 0, 0);
        const year = dateObj.getUTCFullYear();

        if (!bulkOpsByYear[year]) {
          bulkOpsByYear[year] = [];
        } 

        bulkOpsByYear[year].push({
          updateOne: {
            filter: {
              client_id: getMongoDbObjectId(clientId),
              network: 'rakuten',
              date: transDate,
            },
            update: {
              $setOnInsert: {
                client_id: getMongoDbObjectId(clientId),
                network: 'rakuten',
                date: transDate,
                transaction_data: transactions,
                created_at: new Date(),
              },
              $set: {
                updated_at: new Date()
              }
            },
            upsert: true
          }
        });
    }

     // Execute bulkWrite per year
      for (const [year, bulkOps] of Object.entries(bulkOpsByYear)) {
        if (!bulkOps.length) continue;
        
        /**Logic to dynamically create or fetch table (collection)**/
        const modelName = getCentralStorageModel(`central_storage_${year}`);
        
        try {
          await modelName.bulkWrite(bulkOps, { ordered: false });
        } catch (err: any) {
          if (err.mongoose?.validationErrors) {
            err.mongoose.validationErrors.forEach((e: any, index: number) => {
              console.error(`❌ Error at operation #${index}`);
              console.error("Message:", e.message);
            });
          } else {
            console.error(err);
          }
        }
      }
    return true;
  };

}
