import * as apiClient from './awin-client';
import groupDayWiseTransactionData from './awin-utils';
import AffiliatePublishers from "../../../db/models/affiliatePublishers";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";

export class AwinService{
/**
 * Docs reference URL: https://developer.awin.com/apidocs
**/
	async accountInfo(requestData){
		try{
			const url  = `https://api.awin.com/accounts`;
			const response = await apiClient.triggerApi(url,requestData);
			if (response?.status !== 200) {
		        return response;
		    }else{
	        	return response?.data;
	      	}
		}catch(error){
			console.error("Awin API error: ", error);
	      	throw new Error("Failed to fetch Awin Account Info.");
		}
	}

	/**API to fetch the publishers list 
	 * Refrence URL: https://developer.awin.com/apidocs/get-publishers-information-for-advertiser
	**/
	async publishersList(requestData){
		try{
			const url = `https://api.awin.com/advertisers/${requestData?.account_id}/publishers`;
			const response = await apiClient.triggerApi(url,requestData);
			if (response?.status !== 200) {
		        return response;
		    }else{
		    	this.captureToAffiliatePublishers(response?.data,requestData?.client_id);
	        	return response?.data;
	      	}
		}catch(error){

		}
	}

	/**Store Affiliate Publisher to DB**/
  	async captureToAffiliatePublishers(records,client_id){
	    const bulkOps = records.map((publisherData) => ({
	      updateOne: {
	        filter: {
	          client_id: getMongoDbObjectId(client_id),
	          publisher_id: publisherData?.id,
	          network: 'awin',
	        },
	        update: {
	          $setOnInsert: {
	            client_id: getMongoDbObjectId(client_id),
	            publisher_id: publisherData?.id,
	            network: 'awin',
	            created_at: new Date()
	          },
	          $set: {
	          	publisher_name : publisherData?.name.trim(),
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

    /**API to fetch the transactions list for the specific advertiser
	 * Refrence URL: https://developer.awin.com/apidocs/returns-a-list-of-transactions-for-a-given-advertiser-by-ids
	**/
    async transactionList(requestData){
    	try{
    		const url = `https://api.awin.com/advertisers/${requestData?.accountId}/transactions/`+
    					`?startDate=${requestData?.startDate}T00:00:00&endDate=${requestData?.endDate}T23:59:59&dateType=transaction`+
    					`&advertiserId=${requestData?.accountId}&clickRef=true&timezone=${requestData?.timezone}`;
    		const response = await apiClient.triggerApi(url,requestData);
		    if (response?.status !== 200) {
		        return response;
		    }else{
		    	const structuredTransactionData = await groupDayWiseTransactionData(response?.data); 
		        this.captureToCentralStorage(structuredTransactionData,requestData?.clientId);
		        return response?.data;
		    }	
    	}catch(error){

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
			          network: 'awin',
			          date: transactionDate,
			        },
			    	update:{
			    		$setOnInsert: {
			    			client_id : getMongoDbObjectId(clientId),
			                network   : 'awin',
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