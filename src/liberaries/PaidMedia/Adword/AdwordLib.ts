import { GoogleAdsApi } from "google-ads-api";
import { getFormattedDataList } from "./adword-utils";
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { captureToCentralStorage } from "../../../db/schema/capture-central-storage";

export class AdwordService {

  /***
   * Documentation url: https://developers.google.com/google-ads/api/docs/oauth/service-accounts#account_access_setup
   * https://developers.google.com/google-ads/api/fields/v22/overview
   * NodeJS: https://www.npmjs.com/package/google-ads-api
   */

  private client: GoogleAdsApi;
  private refreshToken = process.env.ADWORD_REFRESH_TOKEN;
  private mccId = process.env.ADWORD_MCC_ID;

  constructor() {
    this.client = new GoogleAdsApi({
      client_id: process.env.ADWORD_CLIENT_ID,
      client_secret: process.env.ADWORD_CLIENT_SECRET,
      developer_token: process.env.ADWORD_DEVELOPER_TOKEN,
    });
  }


  async getAllAccounts() {
    const { resource_names } = await this.client.listAccessibleCustomers(this.refreshToken);
    const clientAccounts = [];

    const managerAccount = this.client.Customer({
      customer_id: this.mccId,
      refresh_token: this.refreshToken,
    });

    for await (const row of managerAccount.queryStream(`
      SELECT
          customer_client.client_customer,
          customer_client.descriptive_name,
          customer_client.manager
        FROM customer_client
        WHERE customer_client.level = 1
    `)) {
      clientAccounts.push({
        id: row.customer_client.client_customer.replace('customers/', ''),
        name: row.customer_client.descriptive_name,
        isManager: row.customer_client.manager,
      });
    }
    return clientAccounts;
  }

  async adwordReport(requestData) {

    try {
      const customer = this.client.Customer({
        login_customer_id: this.mccId,
        customer_id: requestData?.customerId,
        refresh_token: this.refreshToken,
      });

      const performanceData = await customer.report({
        entity: "customer",
        metrics: [
          "metrics.cost_micros",
          "metrics.conversions_value_by_conversion_date",
          "metrics.conversions_by_conversion_date",
          "metrics.search_impression_share",
          "metrics.conversions_value",
          "metrics.interactions",
          "metrics.clicks",
          "metrics.impressions",
          "metrics.conversions",
        ],
        segments: requestData?.granularity === 'hourly'
          ? ["segments.date", "segments.hour"]
          : ["segments.date"],
        from_date: requestData?.startDate,
        to_date: requestData?.endDate,
      });
      const formatted = getFormattedDataList(performanceData);

      if (requestData?.granularity !== "hourly") {
        await captureToCentralStorage(formatted, requestData?.clientId, requestData?.connectionId, "adword");
      }

      return formatted;
    } catch (error) {
      await ErrorLogs.insertOne({
        client_id: requestData?.clientId,
        connection_id: requestData?.connectionId,
        network: 'adword',
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        error: JSON.stringify(error)
      });
      logger.error(error, 'Adword Report Error: ');
    }
  }



  async performanceReport(requestData) {
    try {
      const customer = this.client.Customer({
        login_customer_id: this.mccId,
        customer_id: requestData.customerId,
        refresh_token: this.refreshToken,
      });

      const { startDate, endDate } = requestData;

      // ================= AD GROUP (WITH REVENUE) =================
      const adGroups = await customer.report({
        entity: "ad_group",
        metrics: [
          "metrics.clicks",
          "metrics.cost_micros",
          "metrics.conversions_value"   // 🔥 REVENUE
        ],
        segments: ["segments.date"],
        attributes: [
          "ad_group.id",
          "ad_group.name",
        ],
        from_date: startDate,
        to_date: endDate,
      });

      // ================= ASSET GROUP (WITH REVENUE) =================
      const assetGroups = await customer.report({
        entity: "asset_group",
        metrics: [
          "metrics.clicks",
          "metrics.cost_micros",
          "metrics.conversions_value"   // 🔥 REVENUE
        ],
        segments: ["segments.date"],
        attributes: [
          "asset_group.id",
          "asset_group.name",
        ],
        from_date: startDate,
        to_date: endDate,
      });

      return {
        adGroups,
        assetGroups,
      };

    } catch (error) {
      console.error("performanceReport error =>", error);
      throw error;
    }
  }


}
