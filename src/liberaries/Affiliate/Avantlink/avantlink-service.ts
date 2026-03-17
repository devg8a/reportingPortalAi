import * as apiClient from './avantlink-client';
import {
    preparePublisherListApiUrl,
    sanitizePublishersListResponse,
    prepareTransactionListApiUrl,
    sanitizeTransactionListResponse
} from './avantlink-utils';
import { getMongoDbObjectId } from "../../../helper/helper";
import AffiliatePublishers from "../../../db/models/affiliatePublishers";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import ErrorLogs from "../../../db/models/errorLogs";

export class AvantlinkService {
    /**
     * Docs reference URL:  https://classic.avantlink.com/api.php?help=1&module=AffiliateReport
    **/
    async publisherList(requestData) {
        try {
            const url = preparePublisherListApiUrl(requestData);
            const response = await apiClient.triggerApi(url);
            if (!response || response.status !== 200 || response?.data?.some(msg => msg.includes("Invalid"))) {
                return {
                    status_code: 422,
                    success: false,
                    message: "Invalid Avantlink credentials",
                    data: response.data
                };
            }
            const formattedPublisherList =
                await sanitizePublishersListResponse(response.data);
            await this.captureToAffiliatePublishers(
                formattedPublisherList,
                requestData.clientId
            );

            return {
                status_code: 200,
                success: true,
                message: "Avantlink credentials validated successfully",
                data: formattedPublisherList
            };

        } catch (error) {
            throw error;
        }
    }
    async transactionList(requestData) {
        try {
            const url = prepareTransactionListApiUrl(requestData);
            const response = await apiClient.triggerApi(url);
            if (response?.status !== 200) {
                return response;
            }else if(Array.isArray(response?.data) && typeof response.data[0] === "string"){
                throw new Error(response?.data[0]);
            }else {
                const formattedTransactionList = await sanitizeTransactionListResponse(response?.data);
                // console.log("formattedTransactionList==>",formattedTransactionList);
                await captureToCentralStorage(formattedTransactionList, requestData?.clientId, requestData?.connectionId, 'avantlink');
                return formattedTransactionList;
            }
        } catch (error) {
            await ErrorLogs.insertOne({
                client_id	  : requestData?.clientId,
                connection_id : requestData?.connectionId,
                network	  	  : "avantlink",
                start_date	  : requestData?.startDate,
                end_date  	  : requestData?.endDate,
                error	  	  : error,
            });
            throw error;
        }
    }

    /**Store Affiliate Publisher to DB**/
    async captureToAffiliatePublishers(records: Record<string, { affiliate_website_name?: string }>, clientId) {
        const bulkOps: any[] = [];
        console.log('records==>', records)
        for (const [publisher_id, publisherData] of Object.entries(records)) {
            console.log('publisher_id==>', publisher_id);
            console.log('publisherData==>', publisherData);
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
                            publisher_name: publisherData?.affiliate_website_name.trim() || null,
                            status: 'active',
                            updated_at: new Date()
                        }
                    },
                    upsert: true
                }
            });
        }

        try {
            const ab = await AffiliatePublishers.bulkWrite(bulkOps, { ordered: false });
            console.log('ab==>', ab);
            console.log('bulkOps==>', bulkOps);
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
}