import * as apiClient  from "./pepperjam-client";
import AffiliatePublishers from "../../../db/models/affiliatePublishers";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import ErrorLogs from "../../../db/models/errorLogs";
import { getMongoDbObjectId } from "../../../helper/helper";
import groupDayWiseTransactionData from "./pepperjam-utils";

	/**
	 * Refersion Library
	 * Docs reference URL:   https://ascendpartner.zendesk.com/hc/en-gb/categories/13943832158877-Advertiser-API-Docs
	 * All Repors: https://ascendpartner.zendesk.com/hc/en-gb/sections/13516122991261-Report
	 * reference URL: https://ascendpartner.zendesk.com/hc/en-gb/articles/13516519137437-Publisher-Resource
	**/

	/**
	 * NOTE: We cant fetch clicks transaction detail API, but clicks can be retreived from transaction summary API
	 * referral_url can be fetched from transaction detail API. 
	 **/

export class PepperjamService {

  	/**Publishers List API**/
  	async publishersList(requestData) {
	    try {
	      const url = `https://api.pepperjamnetwork.com/${process.env.PEPPERJAM_VERSION}`+
					  `/advertiser/publisher?apiKey=${requestData?.apiKey}&format=json&status=joined`;
	      const response = await apiClient.triggerApi(url);
	      if (response?.status !== 200) {
	        return response;
	      }else{
	        // this.captureToAffiliatePublishers(response?.data,requestData?.clientId);
	        return response;
	      }
	    } catch (error) {
	      throw error;
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
    		const url = `https://api.pepperjamnetwork.com/${process.env.PEPPERJAM_VERSION}`+
					    `/advertiser/report/transaction-summary?apiKey=${requestData?.apiKey}`+
					    `&format=json&startDate=${requestData?.startDate}&endDate=${requestData?.endDate}&groupBy=publisher_date`;
	      	const response = await apiClient.triggerApi(url);
		    if (response?.status !== 200) {
		        return response;
		    }else{
		    	const structuredTransactionData = await groupDayWiseTransactionData(response?.data); 
		        await captureToCentralStorage(structuredTransactionData,requestData?.clientId, requestData?.connectionId, 'pepperjam');
		        return response?.data;
		    }
    	}catch(error){
    		await ErrorLogs.insertOne({
				client_id	  : requestData?.clientId,
				connection_id : requestData?.connectionId,
				network	  	  : "pepperjam",
				start_date	  : requestData?.startDate,
				end_date  	  : requestData?.endDate,
				error	  	  : error,
			});
			throw error;
    	}
    }

}