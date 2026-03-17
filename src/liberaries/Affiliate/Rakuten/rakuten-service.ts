import * as apiClient from "./rakuten-client";
import { convertRakutenCSVToJSON } from "./rakuten-utils";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import ErrorLogs from "../../../db/models/errorLogs";

export class RakutenService {

  /**Transaction List API**/
  async transactionList(requestData) {
    try {
      const {
        authToken,
        startDate,
        endDate
      } = requestData;

      if (!authToken || !startDate || !endDate) {
        return {
          status_code: 400,
          success: false,
          message: 'authToken, startDate and endDate are required',
          data: null
        };
      }

      const url =
        `https://ran-reporting.rakutenmarketing.com/en/reports/` +
        `reporting-portal%3A-transaction/filters` +
        `?start_date=${startDate}` +
        `&end_date=${endDate}` +
        `&include_summary=Y` +
        `&tz=GMT` +
        `&date_type=transaction` +
        `&date_format=m/d/yy` +
        `&token=${authToken}`;

      const response = await apiClient.triggerApi(url);
      if(response.status === 200){
        const structuredTransactionData = await convertRakutenCSVToJSON(response?.data);
        // console.log("structuredTransactionData==>",structuredTransactionData);
        await captureToCentralStorage(structuredTransactionData, requestData?.clientId, requestData?.connectionId, 'rakuten');
        return structuredTransactionData;
      }
      return response;
    } catch (error) {
      await ErrorLogs.insertOne({
        client_id	    : requestData?.clientId,
        connection_id : requestData?.connectionId,
        network	  	  : "rakuten",
        start_date	  : requestData?.startDate,
        end_date  	  : requestData?.endDate,
        error	  	    : error,
      });
      throw error;
    }
  }

}
