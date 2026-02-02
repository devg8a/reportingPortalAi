import * as apiClient  from "./pepperjam-client";
import AffiliatePublishers from "../../../db/models/affiliatePublishers";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";
import groupDayWiseTransactionData from "./pepperjam-utils";

export class PepperjamService {

  	/**Publishers List API**/
  	async publishersList(requestData) {
	    try {
	      const url = `https://api.pepperjamnetwork.com/${requestData?.version}`+
					  `/advertiser/publisher?apiKey=${requestData?.apiKey}&format=json&status=joined`;
	      const response = await apiClient.triggerApi(url);
	      if (response?.status !== 200) {
	        return response;
	      }else{
	        this.captureToAffiliatePublishers(response?.data,requestData?.clientId);
	        return response?.data;
	      }
	    } catch (error) {
	      console.error("Pepperjam API error:", error);
	      throw new Error("Failed to fetch Publishers List");
	    }
    }

    /**Store Affiliate Publisher to DB**/
  	async captureToAffiliatePublishers(records,clientId){
	    const bulkOps = records.map((publisherData) => ({
	      updateOne: {
	        filter: {
	          client_id: getMongoDbObjectId(clientId),
	          publisher_id: publisherData?.id,
	          network: 'pepperjam',
	        },
	        update: {
	          $setOnInsert: {
	            client_id: getMongoDbObjectId(clientId),
	            publisher_id: publisherData?.id,
	            network: 'pepperjam',
	            created_at: new Date()
	          },
	          $set: {
	          	publisher_name : `${publisherData?.first_name ?? ''} ${publisherData?.last_name ?? ''}`.trim(),
	            publisher_url  : publisherData?.publisher_url,
	            status         : 'active',
	            updated_at     : new Date()
	          }
	        },
	        upsert: true
	      }
	    }));

	    try {
	      await AffiliatePublishers.bulkWrite(bulkOps, { ordered: false });
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
    };

    async transactionList(requestData){
    	try{
    		const url = `https://api.pepperjamnetwork.com/${requestData?.version}`+
					    `/advertiser/report/transaction-summary?apiKey=${requestData?.apiKey}`+
					    `&format=json&startDate=${requestData?.startDate}&endDate=${requestData?.endDate}&groupBy=publisher_date`;
	      	const response = await apiClient.triggerApi(url);
		    if (response?.status !== 200) {
		        return response;
		    }else{
		    	const structuredTransactionData = await groupDayWiseTransactionData(response?.data); 
		        this.captureToCentralStorage(structuredTransactionData,requestData?.clientId);
		        return response?.data;
		    }
    	}catch(error){
    		console.log('Pepperjam Transactions List API error==>',error);
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
			          network: 'pepperjam',
			          date: transactionDate,
			        },
			    	update:{
			    		$setOnInsert: {
			    			client_id : getMongoDbObjectId(clientId),
			                network   : 'pepperjam',
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