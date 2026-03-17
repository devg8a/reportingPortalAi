import Criteo_API from "criteo-api";
import logger from '../../../utils/logger';
import ErrorLogs from "../../../db/models/errorLogs";
import { buildDaywiseMetrics } from "./criteo-utils";
import { captureToCentralStorage } from "../../../db/schema/capture-central-storage";

/**
 * Documentation: https://developers.criteo.com/retail-media/docs/api-client-libraries
 */

export class CriteoService {
    private criteo: Criteo_API;
    constructor() {
        this.criteo = new Criteo_API(process.env.CRITEO_CLIENT_ID, process.env.CRITEO_CLIENT_SECRET, "api.criteo.com", "", "2022-04");
    }

    async getAllAccounts() {
        try {
            const audiences = await this.criteo.getAdvertiserPortfolio();
            const accountsList = audiences?.data?.map(account => ({
                id: account?.id,
                name: account?.attributes?.advertiserName
            }));
            return accountsList;
        } catch (error) {
            logger.error(error, "Criteo Error: ");

        }
    }

    async getStatisticsReport(requestData) {
        try {
            const query = {
                'advertiserIds': requestData?.accountId,
                'startDate': `${requestData?.startDate}T04:00:00.000Z`,
                'endDate': `${requestData?.endDate}T04:00:00.000Z`,
                'format': 'json',
                'dimensions': ['Day'],
                'metrics': [
                    'Displays',
                    'Clicks',
                    "AdvertiserCost",
                    "RevenueGeneratedAllPc30d",
                    "SalesPc30d"
                ],
                'currency': 'USD'
            };
            const statReport = await this.criteo.getStatsReport(query);
            // console.log(statReport, "statReport")
            const response = buildDaywiseMetrics(statReport, requestData?.granularity);
            captureToCentralStorage(response, requestData.clientId, requestData.connectionId, "criteo");
            return response;
        } catch (error) {
            await ErrorLogs.insertOne({
                client_id: requestData?.clientId,
                connection_id: requestData?.connectionId,
                network: 'criteo',
                start_date: requestData?.startDate,
                end_date: requestData?.endDate,
                error: JSON.stringify(error)
            });
            logger.error(error, 'Criteo Report Error: ');
            throw error;
        }
    }


}