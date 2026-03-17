import * as apiClient from './shopify-client';
import { storeDetailParameters, salesParameters, buildDaywiseMetrics, sessionParameters, PerformanceParameters } from './shopify-utils';
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';

export class ShopifyService {
  private apiVersion = process.env.SHOPIFY_VERSION;

  async storeDetailsApi(requestData) {
    const url = `${requestData?.storeUrl}/admin/api/${this.apiVersion}/graphql.json`;
    const query = storeDetailParameters();
    const response = await apiClient.triggerShopDetailApi(url, requestData?.accessToken, query);
    if (response?.status !== 200) {
      return response;
    } else {
      // logger.error(response, 'Shopify Connection Error: ');
      return response;
    }
  }

  async salesreport(requestData) {
    // console.log(requestData, "requestData")
    const url = `${requestData?.storeUrl}/admin/api/${this.apiVersion}/graphql.json`;
    /**SALES data Query**/
    const salesQuery = await salesParameters(requestData);
    const salesResponse = await apiClient.triggerApi(url, requestData?.accessToken, salesQuery);

    /**SESSION data Query**/
    const sessionQuery = sessionParameters(requestData);
    const sessionResponse = await apiClient.triggerApi(url, requestData?.accessToken, sessionQuery);

    var formattedResponse = {};
    if (salesResponse?.status === 200 && sessionResponse.status == 200) {
      formattedResponse = buildDaywiseMetrics(salesResponse?.data, sessionResponse?.data, requestData?.granularity);
      if (requestData?.granularity !== "hourly") {
        await captureToCentralStorage(formattedResponse, requestData?.clientId, requestData?.connectionId, "shopify");
      }
    } else {
      logger.error('Shopify Report Error');
      await ErrorLogs.insertOne({
        client_id: requestData?.clientId,
        connection_id: requestData?.connectionId,
        network: "shopify",
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        error: JSON.stringify(salesResponse)
      });
    }
    // console.log(formattedResponse, "formattedResponse")
    return formattedResponse;
  }


  async PerformanceReport(requestData) {
    // console.log(requestData, "requestData")
    const url = `${requestData?.storeUrl}/admin/api/${this.apiVersion}/graphql.json`;
    const salesQuery = await PerformanceParameters(requestData);

    const salesResponse = await apiClient.triggerApi(
      url,
      requestData?.accessToken,
      salesQuery
    );

    if (salesResponse?.status !== 200) {
      await ErrorLogs.insertOne({
        client_id: requestData?.clientId,
        connection_id: requestData?.connection_id,
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        error: JSON.stringify(salesResponse)
      });
      return [];
    }

    // console.log(salesResponse, "salesResponse")

    // ================= RAW ROWS =================
    const rows = salesResponse?.data || [];


    // ================= DATE RANGE =================
    const getDatesBetween = (start: string, end: string) => {
      const dates: string[] = [];
      let d = new Date(start);
      const endDate = new Date(end);

      while (d <= endDate) {
        dates.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
      return dates;
    };

    const dates = getDatesBetween(
      requestData.startDate,
      requestData.endDate
    );

    // ================= MAP EXISTING DATA =================
    const dataMap = new Map<string, any>();

    rows.forEach((r: any) => {
      dataMap.set(`${r.product_title}_${r.day}`, r);
    });

    // ================= FILL MISSING DAYS WITH 0 =================
    const finalData: any[] = [];

    const productTitles = [...new Set(rows.map((r: any) => r.product_title))];

    productTitles.forEach(product_title => {
      dates.forEach(day => {
        const key = `${product_title}_${day}`;
        const row = dataMap.get(key);

        finalData.push({
          product_title,
          day,
          gross_sales: Number(row?.gross_sales || 0),
          discounts: Number(row?.discounts || 0),
          shipping_charges: Number(row?.shipping_charges || 0),
          taxes: Number(row?.taxes || 0),
          returns: Number(row?.returns || 0),
          net_sales: Number(row?.net_sales || 0),
          total_sales: Number(row?.total_sales || 0),
        });
      });
    });

    return finalData;
  }


}
