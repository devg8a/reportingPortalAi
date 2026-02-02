import { request } from 'node:http';
import * as apiClient from './avantlink-client';
import { preparePublisherListApiUrl, 
        sanitizePublishersListResponse,
        prepareTransactionListApiUrl,
        sanitizeTransactionListResponse } from './avantlink-utils';
import { getMongoDbObjectId } from "../../../helper/helper";
import AffiliatePublishers from "../../../db/models/affiliatePublishers";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";

export class AvantlinkService{
    /**
	 * Docs reference URL:  https://classic.avantlink.com/api.php?help=1&module=AffiliateReport
	**/
    async publisherList(requestData){
        try{
            const url = preparePublisherListApiUrl(requestData);
            const response = await apiClient.triggerApi(url);
            if (response?.status !== 200) {
		        return response;
		    }else{
                const formattedPublisherList = await sanitizePublishersListResponse(response?.data);
                this.captureToAffiliatePublishers(formattedPublisherList,requestData.clientId);
	        	return formattedPublisherList;
	      	}
        }catch(error){
            console.error("Avantlink API error: ", error);
	      	throw new Error("Failed to fetch Avantlink Publisher List.");
        }
    }

    async transactionList(requestData){
        try{
            const url = prepareTransactionListApiUrl(requestData);
            const response = await apiClient.triggerApi(url);
            if (response?.status !== 200) {
		        return response;
		    }else{
                const formattedTransactionList = await sanitizeTransactionListResponse(response?.data);
                this.captureToCentralStorage(formattedTransactionList,requestData.clientId);
	        	return formattedTransactionList;
	      	}
        }catch(error){
            console.error("Avantlink API error: ", error);
	      	throw new Error("Failed to fetch Avantlink Publisher List.");
        }
    }

    /**Store Affiliate Publisher to DB**/
    async captureToAffiliatePublishers(records: Record<string, { affiliate_website_name?: string }>,clientId){
        const bulkOps: any[] = [];
        console.log('records==>',records)
        for (const [publisher_id, publisherData] of Object.entries(records)) {
            console.log('publisher_id==>',publisher_id);
            console.log('publisherData==>',publisherData);
            bulkOps.push({
                updateOne: {
                    filter: {
                        client_id: getMongoDbObjectId(clientId),
                        publisher_id: publisher_id,
                        network: 'avantlink',
                    },
                    update: {
                        $setOnInsert: {
                            client_id: getMongoDbObjectId(clientId),
                            publisher_id: publisher_id,
                            network: 'avantlink',
                            created_at: new Date()
                        },
                        $set: {
                            publisher_name : publisherData?.affiliate_website_name.trim() || null,
                            status         : 'active',
                            updated_at     : new Date()
                        }
                    },
                    upsert: true
                }
            });
        }

        try {
            const ab = await AffiliatePublishers.bulkWrite(bulkOps, { ordered: false });
            console.log('ab==>',ab);
            console.log('bulkOps==>',bulkOps);
        } catch (err: any) {
            if (err.mongoose?.validationErrors) {
                err.mongoose.validationErrors.forEach((e: any, index: number) => {
                console.error("Error Message:", e.message);
            });
            } else {
            console.error(err);
            }
        }
        return true;
    }

    /**Store Transaction Records to DB**/
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
                          network: 'avantlink',
                          date: transactionDate,
                        },
                        update:{
                            $setOnInsert: {
                                client_id : getMongoDbObjectId(clientId),
                                network   : 'avantlink',
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