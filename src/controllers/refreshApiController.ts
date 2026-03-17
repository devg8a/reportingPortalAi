import { DEFAULT_NETWORKS, MODULE_NETWORK_MAP } from "../config/moduleNetwork";
import clientConnections from "../db/models/clientConnections";
import clientDetails from "../db/models/clientDetails";
import schedularLogs from "../db/models/schedularLogs";
/** PAID MEDIA NETWORKS **/
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { analyticsDataService } from "../liberaries/PaidMedia/GA4/analyticsDataLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";
import { CriteoService } from "../liberaries/PaidMedia/Criteo/CriteoLib";
import { BingService } from "../liberaries/PaidMedia/Bing/BingLib";
import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import { KlaviyoService } from "../liberaries/PaidMedia/Klaviyo/klaviyo-service";
/** AFFILIATE NETWORKS **/
import { ImpactService } from "../liberaries/Affiliate/Impact/impact-service";
import { RakutenService } from "../liberaries/Affiliate/Rakuten/rakuten-service";
import { PepperjamService } from "../liberaries/Affiliate/Pepperjam/pepperjam-service";
import { AwinService } from "../liberaries/Affiliate/Awin/awin-service";
import { AvantlinkService } from "../liberaries/Affiliate/Avantlink/avantlink-service";
import { CjService } from "../liberaries/Affiliate/Cj/cj-service";
import { LevantaService } from "../liberaries/Affiliate/Levanta/levanta-service";
import logger from "../utils/logger";

export const refreshModuleData = async (req, res) => {
    try {
        const { clientId, dateRange } = req.body;
        const moduleKey = req?.header('x-module-key');

        const client = await clientDetails.findOne({ _id: clientId, status: "active" });
        if (!client) {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: "Invalid Client ID or Inactive Client.",
                data: null
            });
        }

        const connections = await clientConnections.find({
            client_id: clientId,
            status: "active"
        }).lean();
        // const validNetworkIds = connections.map((conn) => conn._id);
        // const networks = connections.map((conn) => conn.network);

        const divergenceModuleNetworks = moduleBasedNetworkList(moduleKey);
        const validNetworksDataList = connections.filter(conn => divergenceModuleNetworks.includes(conn.network));
        const response = await triggerNetworkApis(validNetworksDataList, dateRange);
        // logger.info(response,"response==>");

        res.status(200).json({
            success: true,
            status_code: 200,
            message: "Refresh API triggered",
            data: response
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status_code: 500,
            message: error?.message,
            data: error
        });
    }
};

function moduleBasedNetworkList(module_key: string | null = null): string[] {
    if (!module_key) return DEFAULT_NETWORKS;
    return MODULE_NETWORK_MAP[module_key] || DEFAULT_NETWORKS;
}

async function triggerNetworkApis(networkDataList, dateRange) {
    const bulkInsertPayload: any[] = [];
    const networkHandlers: Record<string, (data: any, conn: any) => Promise<any>> = {
        shopify: (data, conn) => {
            const reqData = { ...data, storeUrl: conn.value, accessToken: conn.token };
            return new ShopifyService().salesreport(reqData);
        },
        ga: (data, conn) => {
            const reqData = { ...data, accountId: conn.value };
            return new analyticsDataService().fetchAnalyticsReport(reqData);
        },
        meta: (data, conn) => {
            const reqData = { ...data, accountId: conn.value };
            return new MetaService().getMetaAccountData(reqData);
        },
        adword: (data, conn) => {
            const reqData = { ...data, customerId: conn.value };
            return new AdwordService().adwordReport(reqData);
        },
        bing: async (data, conn) => {
            // await delay(60000); // ⏳ 1 minute delay
            const reqData = { ...data, accountId: conn.value };
            return new BingService().generateReport(reqData);
        },
        criteo: (data, conn) => {
            const reqData = { ...data, accountId: conn.value };
            return new CriteoService().getStatisticsReport(reqData);
        },
        klaviyo: (data, conn) => {
            const monthRanges = buildDateRangesByDays(new Date(data.startDate),new Date(data.endDate),30);
            if(monthRanges.length == 1){
                const reqData = {
                    ...data,
                    privateKey: conn.value,
                    conversionMetricId: conn.token
                };
                return new KlaviyoService().fetchKlaviyoRecords(reqData);
            }else{
                monthRanges.forEach(daterange =>{
                    bulkInsertPayload.push({
                        client_id    : data?.clientId,
                        connection_id: data?.connectionId,
                        type         : "module_refresh", 
                        priority     : 1,
                        network      : data?.network,
                        start_date   : daterange?.startDate, 
                        end_date     : daterange?.endDate, 
                        status       : "pending", 
                    });
                });
                return Promise.resolve();
            }
        },
        rakuten: (data, conn) => {
            const reqData = {
                ...data,
                authToken: conn.value,
            };
            return new RakutenService().transactionList(reqData);
        },
        impact: (data, conn) => {
            const reqData = {
                ...data,
                programId: conn?.program_id,
                accountId: conn?.value,
                authToken: conn?.token,
            };
            return new ImpactService().transactionList(reqData);
        },
        awin: (data, conn) => {
            const monthRanges = buildDateRangesByDays(new Date(data.startDate),new Date(data.endDate),31);
            if(monthRanges.length == 1){
                const reqData = {
                    ...data,
                    accountId: conn.value,
                    authToken: conn.token,
                    timezone: conn.timezone,
                };
                return new AwinService().transactionList(reqData);
            }else{
                monthRanges.forEach(daterange =>{
                    bulkInsertPayload.push({
                        client_id    : data?.clientId,
                        connection_id: data?.connectionId,
                        type         : "module_refresh", 
                        priority     : 1,
                        network      : data?.network,
                        start_date   : daterange?.startDate, 
                        end_date     : daterange?.endDate, 
                        status       : "pending", 
                    });
                });
                return Promise.resolve();
            }
        },
        avantlink: (data, conn) => {
            const monthRanges = buildDateRangesByDays(new Date(data.startDate),new Date(data.endDate),180);
            if(monthRanges.length == 1){
                const reqData = {
                    ...data,
                    accountId: conn.value,
                    authKey: conn.token,
                };
                return new AvantlinkService().transactionList(reqData);
            }else{
                monthRanges.forEach(daterange =>{
                    bulkInsertPayload.push({
                        client_id    : data?.clientId,
                        connection_id: data?.connectionId,
                        type         : "module_refresh", 
                        priority     : 1,
                        network      : data?.network,
                        start_date   : daterange?.startDate, 
                        end_date     : daterange?.endDate, 
                        status       : "pending", 
                    });
                });
                return Promise.resolve();
            }
        },
        cj: (data, conn) => {
            const monthRanges = buildDateRangesByDays(new Date(data.startDate),new Date(data.endDate),31);
            if(monthRanges.length == 1){
                const reqData = {
                    ...data,
                    accountId: conn.value,
                };
                return new CjService().transactionList(reqData);
            }else{
                monthRanges.forEach(daterange =>{
                    bulkInsertPayload.push({
                        client_id    : data?.clientId,
                        connection_id: data?.connectionId,
                        type         : "module_refresh", 
                        priority     : 1,
                        network      : data?.network,
                        start_date   : daterange?.startDate, 
                        end_date     : daterange?.endDate, 
                        status       : "pending", 
                    });
                });
                return Promise.resolve();
            }
        },
        levanta: (data, conn) => {
            const reqData = {
                ...data,
                apiKey: conn.value,
            };
            return new LevantaService().transactionList(reqData);
        },
        pepperjam: (data, conn) => {
            const reqData = {
                ...data,
                apiKey: conn.value,
            };
            return new PepperjamService().transactionList(reqData);
        }
    };

    const allPromises: Promise<any>[] = [];

    for (const connection of networkDataList) {
        const handler = networkHandlers[connection.network];
        if (!handler) continue;

        for (const dates of dateRange) {
            const payload = {
                startDate: dates?.startDate,
                endDate: dates?.endDate,
                connectionId: connection?._id,
                clientId: connection?.client_id,
                network: connection?.network,
            };

            allPromises.push(
                handler(payload, connection)
                    .then(result => ({
                        network: connection?.network,
                        payload,
                        response: result,
                    }))
                    .catch(async (error) => {
                        await schedularLogs.insertOne({
                            client_id: connection?.client_id,
                            connection_id: connection?._id,
                            network: connection?.network,
                            type: "module_refresh",
                            start_date: payload?.startDate,
                            end_date: payload?.endDate,
                            status: "error",
                            error: error,
                        });
                        throw {
                            network: connection.network,
                            payload,
                            response: error
                        };
                    })
            );
            if (bulkInsertPayload.length) {
                console.log("bulkInsertPayload==>",bulkInsertPayload)
                await schedularLogs.insertMany(bulkInsertPayload);
            }
        }
    }

    let finalresult = {
        total: 0,
        success: 0,
        failed: 0,
        success_networks: [] as any[],
        failed_networks: [] as any[],
    };
    const executionResult = await Promise.allSettled(allPromises);
    // logger.info(executionResult,"executionResult===>");
    executionResult.forEach((result) => {
        if (result.status === "rejected") {
            finalresult.failed += 1;
            finalresult.failed_networks.push({
                network: result?.reason?.network,
                connectionId: result?.reason?.payload?.connectionId,
                clientId: result?.reason?.payload?.clientId,
                error: result?.reason?.response
            });
        } else {
            finalresult.success += 1;
            finalresult.success_networks.push({
                network: result?.value?.network,
                connectionId: result?.value?.payload?.connectionId,
                clientId: result?.value?.payload?.clientId,
            });
        }
    });

    finalresult.total = executionResult.length;
    return finalresult;
}

function buildDateRangesByDays(
  startDate: Date,
  endDate: Date,
  dayAggregation: number
) {
  const ranges: { startDate: Date; endDate: Date }[] = [];

  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    const rangeStart = new Date(cursor);

    const tempEnd = new Date(cursor);
    tempEnd.setUTCDate(tempEnd.getUTCDate() + dayAggregation - 1);

    const rangeEnd = tempEnd > endDate ? endDate : tempEnd;

    ranges.push({
      startDate: rangeStart,
      endDate: rangeEnd
    });

    cursor.setUTCDate(cursor.getUTCDate() + dayAggregation);
  }

  return ranges;
}

// function buildDateRanges(
//   startDate: Date,
//   endDate: Date,
//   monthAggregation: number = 1
// ) {
//   const ranges: { startDate: Date; endDate: Date }[] = [];

//   let cursor = new Date(startDate);

//   while (cursor <= endDate) {
//     const rangeStart = new Date(cursor);

//     const tempEnd = new Date(Date.UTC(
//       cursor.getUTCFullYear(),
//       cursor.getUTCMonth() + monthAggregation,
//       0
//     ));

//     const rangeEnd = tempEnd > endDate ? endDate : tempEnd;

//     ranges.push({
//       startDate: rangeStart,
//       endDate: rangeEnd
//     });

//     cursor = new Date(Date.UTC(
//       cursor.getUTCFullYear(),
//       cursor.getUTCMonth() + monthAggregation,
//       1
//     ));
//   }

//   return ranges;
// }

const delay = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms));