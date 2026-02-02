import * as apiClient from './levanta-client';
// import groupDayWiseTransactionData from "./levanta-utils";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";

export class LevantaService{
    /**
	 * Docs reference URL:   https://levanta.notion.site/Seller-API-Documentation-92ce465ac3a84aecaa3f179b641c672b
	**/
    async publisherList(requestData){
        console.log('requestData==>',requestData)
        const url = `https://app.levanta.io/api/seller/v1/creators/active?limit=100`;
        const response = await apiClient.triggerApi(url,requestData);
    }
}