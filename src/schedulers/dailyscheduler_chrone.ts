import clientConnections from "../db/models/clientConnections";
import clientDetails from "../db/models/clientDetails";

import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { analyticsDataService } from "../liberaries/PaidMedia/GA4/analyticsDataLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";
import { CriteoService } from "../liberaries/PaidMedia/Criteo/CriteoLib";
import { BingService } from "../liberaries/PaidMedia/Bing/BingLib";
import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import { getDateRange } from "../helper/helper";


console.log("Optimised Cron Loaded...");

// RETRY
async function retry(fn: Function, retries: number = 2) {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 0) throw err;
        console.log("Retrying...");
        return retry(fn, retries - 1);
    }
}

// SAFE RUN
const safeRun = async (fn: Function, network: string) => {
    try {
        console.log(`→ Running ${network}`);
        await retry(fn);
        console.log(`✔ Completed ${network}`);
    } catch (e) {
        console.log(`✖ Error in ${network}`, e);
    }
};

// MAIN FUNCTION
export async function runDailyRefresh() {
    console.log("REFRESH STARTED");

    // <<––––––––– USING HELPER NOW
    const { start_date, end_date } = getDateRange();
    const baseRequest = {
        startDate: start_date,
        endDate: end_date,
    };

    // FETCH ACTIVE CLIENTS
    const activeClients = await clientDetails.find({ status: "active" });

    // FETCH ALL CONNECTIONS AT ONCE (FASTER)
    const allConnections = await clientConnections.find({});

    // PARALLEL CLIENT EXECUTION
    await Promise.allSettled(
        activeClients.map(async (client) => {
            console.log(`\nPROCESSING CLIENT: ${client.name}`);

            const connections = allConnections.filter(
                (c) => c.client_id.toString() === client._id.toString()
            );

            // PARALLEL NETWORK EXECUTION
            const tasks = connections.map((conn) => {
                const req = {
                    ...baseRequest,
                    clientId: client._id,
                    connectionId: conn._id,
                };

                switch (conn.network) {
                    case "meta":
                        return safeRun(
                            () =>
                                new MetaService().getMetaAccountData({
                                    ...req,
                                    accountId: conn.value,
                                }),
                            "Meta"
                        );

                    case "ga":
                        return safeRun(
                            () =>
                                new analyticsDataService().fetchAnalyticsReport({
                                    ...req,
                                    accountId: conn.value,
                                }),
                            "GA4"
                        );

                    case "adword":
                        return safeRun(
                            () =>
                                new AdwordService().adwordReport({
                                    ...req,
                                    customerId: conn.value,
                                }),
                            "AdWords"
                        );

                    case "criteo":
                        return safeRun(
                            () =>
                                new CriteoService().getStatisticsReport({
                                    ...req,
                                    accountId: conn.value,
                                }),
                            "Criteo"
                        );

                    case "bing":
                        return safeRun(
                            () =>
                                new BingService().generateReport({
                                    ...req,
                                    accountId: conn.value,
                                }),
                            "Bing"
                        );

                    case "shopify":
                        return safeRun(
                            () =>
                                new ShopifyService().salesreport({
                                    ...req,
                                    storeUrl: conn.value,
                                    accessToken: conn.token,
                                }),
                            "Shopify"
                        );

                    default:
                        console.log("Unknown network:", conn.network);
                        return Promise.resolve();
                }
            });

            await Promise.allSettled(tasks);
        })
    );

    console.log("\nREFRESH FINISHED");
}
