import * as apiClient from './bing-client';
import { prepareReportBody, getBingReportRows } from './bing-utils';
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';

/**
 * https://learn.microsoft.com/en-us/advertising/guides/?view=bingads-13
 * https://learn.microsoft.com/en-us/advertising/reporting-service/submitgeneratereport?view=bingads-13&tabs=prod&pivots=rest
 * Metrics: https://learn.microsoft.com/en-us/advertising/reporting-service/accountperformancereportcolumn?view=bingads-13
 */
export class BingService {
  private apiRequestData: any = {};

  async fetchAccessToken() {
    const accessToken = await apiClient.authenticate();
    return accessToken;
  }

  async getAllAccounts() {
    try {
      const accessToken = await this.fetchAccessToken();
      const url = "https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13/Accounts/Find";
      const query = { 'TopN': 5000 };
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "DeveloperToken": process.env.BING_DEVELOPER_TOKEN,
      };
      const response = await apiClient.triggerApi(url, headers, query);
      if (response.status == 200) {
        return response?.data?.AccountsInfo;
      } else {
        return response;
      }
    } catch (error) {
      console.log('error==>', error);

    }
  }

  async generateReport(requestData) {
    try {
      this.apiRequestData = requestData;
      const accessToken    = await this.fetchAccessToken();
      const reportId       = await this.generateReportId(requestData, accessToken);
      // console.log("reportId==>",reportId);
      if (!reportId) {
        throw new Error(`Failed to generate Bing reportId | requestData: ${JSON.stringify(requestData)}`);
      }
      const reportResponse = await this.reportDownload(reportId, accessToken);
      // console.log("reportResponse==>",reportResponse);
      if (reportResponse) {
        captureToCentralStorage(reportResponse, requestData?.clientId, requestData?.connectionId, 'bing');
      }
      return reportResponse;
    } catch (error) {
      await ErrorLogs.insertOne({
        client_id: requestData?.clientId,
        connection_id: requestData?.connectionId,
        network: "bing",
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        error: error?.message ?? JSON.stringify(error),
      });
      throw error;
    }
  }

  async generateReportId(requestData, accessToken) {
    try {
      const url = "https://reporting.api.bingads.microsoft.com/Reporting/v13/GenerateReport/Submit";
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "DeveloperToken": process.env.BING_DEVELOPER_TOKEN,
      };
      const body = prepareReportBody(requestData);
      const response = await apiClient.triggerApi(url, headers, body);
      if (response.status == 200) {
        return response?.data?.ReportRequestId;
      }
    } catch (error) {
      logger.error(error, "Error in Bing Report Id generate: ")
      throw error;
    }
  }

  async fetchReportStatus(reportId, accessToken) {
    try {
      const url = "https://reporting.api.bingads.microsoft.com/Reporting/v13/GenerateReport/Poll";
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "DeveloperToken": process.env.BING_DEVELOPER_TOKEN,
      };
      const body = {
        ReportRequestId: reportId
      }
      const response = await apiClient.triggerApi(url, headers, body);
      // console.log("fetchReportStatus response==>",response);
      if (response.status == 200) {
        if (response?.data?.ReportRequestStatus?.Status == 'Pending' || response?.data?.ReportRequestStatus?.Status == 'undefined') {
          // console.log("ReportRequestStatus data==>",response?.data);
          return await this.fetchReportStatus(reportId, accessToken);
        } else {
          return response?.data?.ReportRequestStatus;
        }
      }
    } catch (error) {
      await ErrorLogs.insertOne({
        client_id: this.apiRequestData?.clientId,
        connection_id: this.apiRequestData?.connection_id,
        network: "bing",
        start_date: this.apiRequestData?.startDate,
        end_date: this.apiRequestData?.endDate,
        error: JSON.stringify(error)
      });
      logger.error(error, "Error in Bing Report Status: ");
    }
  }

  async reportDownload(reportId, accessToken) {
    try {
      const reportStatus = await this.fetchReportStatus(reportId, accessToken);
      // console.log("reportStatus:",reportStatus);
      if (reportStatus?.Status == 'Success' && reportStatus?.ReportDownloadUrl == null) {
          return []; //no data available, thats why the url is null
      } else {
        // console.log("error reportStatus:",reportStatus);
        const downloadUrl = reportStatus?.ReportDownloadUrl;
        const result = await getBingReportRows(downloadUrl);
        // logger.info(result,"result: ");
        return result;
      }
    } catch (error) {
      await ErrorLogs.insertOne({
        client_id: this.apiRequestData?.clientId,
        connection_id: this.apiRequestData?.connection_id,
        network: "bing",
        start_date: this.apiRequestData?.startDate,
        end_date: this.apiRequestData?.endDate,
        error: JSON.stringify(error)
      });
      throw error;
    }
  } catch(error) {
    logger.error(error, 'Error in Bing Report Download');
    throw error;
  }
}



// async generateReportId(requestData,accessToken){
//   try{
//     const url     = "https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc";
//     const headers = {
//       "Content-Type" : "text/xml; charset=utf-8",
//       "SOAPAction"   : "SubmitGenerateReport"
//     };
//     const body     = prepareReportBody(requestData,accessToken);
//     const xmlResponse = await apiClient.triggerApi(url,headers,body);
//     if(xmlResponse.status == 200){
//       const match      = xmlResponse?.data?.match(/<[^:>]*:?ReportRequestId[^>]*>([^<]+)<\/[^:>]*:?ReportRequestId>/i);
//       const trackingId = match ? match[1].trim() : null;
//       return trackingId;
//     }
//   }catch(error){
//     logger.error(error,"Error in generating Bing ReportId");
//   }

// }

