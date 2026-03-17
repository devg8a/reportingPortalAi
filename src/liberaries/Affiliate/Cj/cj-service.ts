import * as apiClient from './cj-client';
import groupDayWiseTransactionData from "./cj-utils";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import ErrorLogs from "../../../db/models/errorLogs";

export class CjService{
    /**
     * documentation url: https://developers.cj.com/graphql/reference/Commission%20Detail
     */
    
   async transactionList(requestData) {
    try {
      const url = `https://commissions.api.cj.com/query`;
      const response = await apiClient.triggerApi(url, requestData);

      if (!response || response.status !== 200) {
        return response;
      }
      const structuredTransactionData = await groupDayWiseTransactionData(response?.data);
      await captureToCentralStorage(structuredTransactionData, requestData?.clientId, requestData?.connectionId, 'cj');
      return structuredTransactionData;
    } catch (error) {
      await ErrorLogs.insertOne({
          client_id	    : requestData?.clientId,
          connection_id : requestData?.connectionId,
          network	  	  : "cj",
          start_date	  : requestData?.startDate,
          end_date  	  : requestData?.endDate,
          error	  	    : error,
      });
      throw error;
    }
  }
}