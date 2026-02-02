import * as apiClient from './bing-client';
import { prepareReportBody, getBingReportRows } from './bing-utils';
import logger from '../../../utils/logger';
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';

export class BingService {

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
    const accessToken = await this.fetchAccessToken();
    const reportId = await this.generateReportId(requestData, accessToken);
    const reportResponse = await this.reportDownload(reportId, accessToken);
    captureToCentralStorage(reportResponse, requestData?.clientId, requestData?.connectionId, 'bing');
    return reportResponse;
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
      if (response.status == 200) {
        if (response?.data?.ReportRequestStatus?.Status == 'Pending') {
          await this.fetchReportStatus(reportId, accessToken);
        } else {
          return response?.data?.ReportRequestStatus;
        }
      }
    } catch (error) {
      logger.error(error, "Error in Bing Report Status: ");
    }
  }

  async reportDownload(reportId, accessToken) {
    try {
      const reportStatus = await this.fetchReportStatus(reportId, accessToken);
      // logger.info(reportStatus,'reportStatus: ');
      if (reportStatus?.status == 'Success' && reportStatus?.ReportDownloadUrl == null) {
        return [];
      } else {
        const downloadUrl = reportStatus?.ReportDownloadUrl;
        const result = await getBingReportRows(downloadUrl);
        // logger.info(result,"result: ");
        return result;
      }
    } catch (error) {
      logger.error(error, 'Error in Bing Report Download: ');
    }
  } catch(error) {
    logger.error(error, 'Error in Bing Report Download');
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

