import { GoogleAdsApi } from "google-ads-api";
import { getFormattedDataList } from "./adword-utils";
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { captureToCentralStorage } from "../../../db/schema/capture-central-storage";

export class AdwordService {

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
        account_id: requestData?.customerId,
        network: 'adword',
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        error: JSON.stringify(error)
      });
      logger.error(error, 'Adword Report Error: ');
    }
  }

  // async performanceReport(requestData) {
  //   try {
  //     const customer = this.client.Customer({
  //       login_customer_id: this.mccId,
  //       customer_id: requestData?.customerId,
  //       refresh_token: this.refreshToken,
  //     });
  //     const adGroupIds = [158722987630, 146179077352, 155417077878, 155417077678, 155417077918];
  //     const assetGroupIds = [6477362957, 6530117625, 6525783182, 6525835894];

  //     const performanceData = await customer.query(`
  //       SELECT
  //         ad_group.id,
  //         ad_group.name,
  //         metrics.clicks,
  //         metrics.cost_micros
  //       FROM ad_group
  //       WHERE ad_group.id IN (${adGroupIds.join(",")})
  //         AND segments.date BETWEEN '${requestData.startDate}' AND '${requestData.endDate}'
  //     `);
  //     console.log('performanceData==>', performanceData);

  //     const assetperformanceData = await customer.query(`
  //       SELECT
  //         asset_group.id,
  //         asset_group.name,
  //         metrics.clicks,
  //         metrics.cost_micros
  //       FROM asset_group
  //       WHERE asset_group.id IN (${assetGroupIds.join(",")})
  //         AND segments.date BETWEEN '${requestData.startDate}' AND '${requestData.endDate}'
  //     `);
  //     console.log('asset performanceData==>', assetperformanceData);
  //   } catch (error) {

  //   }
  // }



  // AdwordService.js
  async performanceReport(requestData) {
    try {
      const customer = this.client.Customer({
        login_customer_id: this.mccId,
        customer_id: requestData?.customerId,
        refresh_token: this.refreshToken,
      });

      const {
        startDate,
        endDate,
        adGroupIds = [158722987630, 146179077352, 155417077878, 155417077678, 155417077918],
        assetGroupIds = [6477362957, 6530117625, 6525783182, 6525835894]
      } = requestData;

      const adGroupFilter = adGroupIds.length
        ? `AND ad_group.id IN (${adGroupIds.join(",")})`
        : "";

      const assetGroupFilter = assetGroupIds.length
        ? `AND asset_group.id IN (${assetGroupIds.join(",")})`
        : "";

      const performanceData = await customer.query(`
      SELECT
        ad_group.id,
        ad_group.name,
        metrics.clicks,
        metrics.cost_micros
      FROM ad_group
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ${adGroupFilter}
    `);

      const assetPerformanceData = await customer.query(`
      SELECT
        asset_group.id,
        asset_group.name,
        metrics.clicks,
        metrics.cost_micros
      FROM asset_group
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ${assetGroupFilter}
    `);

      // is function se data return karo:
      return {
        adGroups: performanceData,
        assetGroups: assetPerformanceData,
      };
    } catch (error) {
      console.error('performanceReport error ==>', error);
      throw error;
    }
  }
}
