import * as apiClient from './awin-client';
import groupDayWiseTransactionData from './awin-utils';
import AffiliatePublishers from "../../../db/models/affiliatePublishers";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import { getMongoDbObjectId } from "../../../helper/helper";
import ErrorLogs from "../../../db/models/errorLogs";

export class AwinService {
	/**
	 * Docs reference URL: https://developer.awin.com/apidocs
	**/
	async accountInfo(requestData) {
		try {
			const url = `https://api.awin.com/accounts`;
			const response = await apiClient.triggerApi(url, requestData);
			if (response?.status !== 200) {
				return {
					status_code: response?.status || 401,
					success: false,
					message: "Failed to fetch Awin Account Info",
					data: null
				};
			} else {
				return {
					status_code: 200,
					success: true,
					message: "Awin account info fetched successfully",
					data: response?.data
				};
			}
		} catch (error) {
			// console.error("Awin API error: ", error);
			throw error;
		}
	}

	/**API to fetch the publishers list 
	 * Refrence URL: https://developer.awin.com/apidocs/get-publishers-information-for-advertiser
	**/
	async publishersList(requestData) {
		try {
			const url = `https://api.awin.com/advertisers/${requestData?.account_id}/publishers`;
			const response = await apiClient.triggerApi(url, requestData);
			if (response?.status !== 200) {
				return response;
			} else {
				// this.captureToAffiliatePublishers(response?.data, requestData?.client_id);
				return response?.data;
			}
		} catch (error) {

		}
	}

	/**Store Affiliate Publisher to DB**/
	async captureToAffiliatePublishers(records, client_id) {
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
						publisher_name: publisherData?.name.trim(),
						status: 'active',
						updated_at: new Date()
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
	async transactionList(requestData) {
		try {
			const url = `https://api.awin.com/advertisers/${requestData?.accountId}/transactions/` +
				`?startDate=${requestData?.startDate}T00:00:00&endDate=${requestData?.endDate}T23:59:59&dateType=transaction` +
				`&advertiserId=${requestData?.accountId}&clickRef=true&timezone=${requestData?.timezone}`;
			const response = await apiClient.triggerApi(url, requestData);
			// console.log("response==>",response);
			if (response?.status !== 200) {
				return response;
			} else {
				const structuredTransactionData = await groupDayWiseTransactionData(response?.data);
				// console.log("structuredTransactionData==>",structuredTransactionData);
				captureToCentralStorage(structuredTransactionData, requestData?.clientId, requestData?.connectionId, 'awin');
				return response?.data;
			}
		} catch (error) {
			await ErrorLogs.insertOne({
				client_id	  : requestData?.clientId,
				connection_id : requestData?.connectionId,
				network	  	  : "awin",
				start_date	  : requestData?.startDate,
				end_date  	  : requestData?.endDate,
				error	  	  : error,
			});
			console.log("Awin Error==>",error);
			throw error;
		}
	}
}