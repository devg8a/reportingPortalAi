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
        const response = await apiClient.triggerApi(url, requestData?.accessToken, query);
        if (response?.status !== 200) {
            return response;
        } else {
            logger.error(response, 'Shopify Connection Error: ');
            return response;
        }
    }

    async salesreport(requestData) {
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
                network: 'shopify',
                start_date: requestData?.startDate,
                end_date: requestData?.endDate,
                error: JSON.stringify(salesResponse)
            });
        }
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
        // console.log(salesResponse, "salesResponse")

        if (salesResponse?.status === 200) {
            return salesResponse?.data;
        }

        await ErrorLogs.insertOne({
            client_id: requestData?.clientId,
            network: 'shopify',
            start_date: requestData?.startDate,
            end_date: requestData?.endDate,
            error: JSON.stringify(salesResponse)
        });

        return {}; // error ke case me empty
    }

}
