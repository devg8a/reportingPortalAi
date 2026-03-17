import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { buildDaywiseMetrics } from "./analytics-utils";
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';

/**
 * Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart?account_type=service
 * Nodejs doc: https://googleapis.dev/nodejs/analytics-data/latest/index.html#installing-the-client-library
 * run report doc: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
 * metrics list: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema#metrics
 */
export class analyticsDataService {

  private KEY_FILE_PATH = path.join(process.cwd(), '/service_account_credentials.json');
  private analyticsClient: BetaAnalyticsDataClient;

  constructor() {
    this.analyticsClient = new BetaAnalyticsDataClient({
      keyFilename: this.KEY_FILE_PATH,
    });
  }

  async fetchAnalyticsReport(requestData) {
    try {
      const dimensions = [
        { name: requestData?.granularity === 'hourly' ? 'dateHour' : 'date' },
        { name: 'sessionDefaultChannelGroup' }
      ];

      const [response] = await this.analyticsClient.runReport({
        property: `properties/${requestData?.accountId}`,
        dateRanges: [
          { startDate: requestData?.startDate, endDate: requestData?.endDate },
        ],
        dimensions: dimensions,
        metrics: [
          { name: 'totalRevenue' },
          { name: 'sessions' },
          { name: 'engagedSessions' },
          { name: 'transactions' },
          { name: 'itemsPurchased' },
          { name: 'newUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }, //in seconds
          { name: 'userEngagementDuration' }, //in seconds
          { name: 'screenPageViewsPerSession' },

        ],
        orderBys: [
          {
            dimension: { dimensionName: requestData?.granularity === 'hourly' ? 'dateHour' : 'date' },
            desc: false,
          }]
      });

      // console.log(response, "resposo")
      const rows = response.rows || [];
      // console.log(rows, "rows")
      // logger.info(rows, 'response')
      const data = buildDaywiseMetrics(rows);
      if (requestData?.granularity !== "hourly") {
        await captureToCentralStorage(data, requestData.clientId, requestData.connectionId, "ga");
      }
      // console.log(data, "data")
      return data;
    } catch (error) {
      await ErrorLogs.insertOne({
        client_id: requestData?.clientId,
        connection_id: requestData?.connectionId,
        network: 'ga',
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        error: JSON.stringify(error)
      });
      logger.error(error, 'GA Report Error: ');
    }
  }


}