import * as apiClient from './levanta-client';
import groupDayWiseTransactionData from "./levanta-utils";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import ErrorLogs from "../../../db/models/errorLogs";

export class LevantaService{
    /**
	 * Docs reference URL:   https://levanta.notion.site/Seller-API-Documentation-92ce465ac3a84aecaa3f179b641c672b
	**/
  async publisherList(requestData) {
    try {
      const url = `https://app.levanta.io/api/seller/v1/creators/active?limit=100`;
      const response = await apiClient.triggerApi(url, requestData);

      if (response?.status !== 200) {
        return {
          status_code: response?.status || 401,
          success: false,
          message: 'Invalid Levanta API key',
          data: null
        };
      }
      return {
        status_code: 200,
        success: true,
        message: 'Levanta account verified successfully',
        data: response?.data?.data
      };

    } catch (error) {
      throw error;
    }
  }

  async transactionList(requestData){
    try{
      const url =`https://app.levanta.io/api/seller/v1/reports`+
                  `?start=${requestData?.startDate}T00:00:00Z&end=${requestData?.endDate}T00:59:59Z&limit=100`;
      const response = await apiClient.triggerApi(url, requestData);
      const structuredTransactionData = await groupDayWiseTransactionData(response?.data?.reports);
      // console.log("structuredTransactionData==>",structuredTransactionData);
      await captureToCentralStorage(structuredTransactionData, requestData?.clientId, requestData?.connectionId, 'levanta');
      return structuredTransactionData;
    }catch(error){
      await ErrorLogs.insertOne({
          client_id	    : requestData?.clientId,
          connection_id : requestData?.connectionId,
          network	  	  : "levanta",
          start_date	  : requestData?.startDate,
          end_date  	  : requestData?.endDate,
          error	  	    : error,
      });
      throw error;
    }
  }
}