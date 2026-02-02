import clientConnections from "../db/models/clientConnections";
import clientDetails from "../db/models/clientDetails";

import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import { analyticsDataService } from "../liberaries/PaidMedia/GA4/analyticsDataLib";
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";

import pLimit from "p-limit";
import moment from "moment";
import AccountSummary from "../db/models/AccountSummary";

console.log("Hourly Raw Data Collector Loaded...");

const safeRun = async (cb: Function, label: string) => {
    try {
        return await cb();
    } catch (err) {
        console.log(`✖ ${label} failed`, err);
        return null;
    }
};

// -----------------------------------------------------------
// NORMALIZE DATE TO "YYYY-MM-DD HH:00" FORMAT IN UTC
// -----------------------------------------------------------
function normalizeHourKey(dateStr: string): string {
    if (!dateStr) return dateStr;

    const m = moment.utc(dateStr);
    if (!m.isValid()) return dateStr;

    return m.format("YYYY-MM-DD HH:00");
}

// -----------------------------------------------------------
// NORMALIZE ALL KEYS AND DATE INSIDE RAW DATA (UTC)
// -----------------------------------------------------------
function normalizeDataKeys(data: any): Record<string, any> {
    if (!data || typeof data !== 'object') return {};

    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        const normalizedKey = normalizeHourKey(key);

        if (value && typeof value === 'object') {
            const normalizedValue = { ...value as any };

            if (normalizedValue.date) {
                normalizedValue.date = normalizedKey;
            }

            if (!normalizedValue.hour) {
                const hour = normalizedKey.split(' ')[1];
                if (hour) {
                    normalizedValue.hour = `${hour}:00 - ${hour}:59:59`;
                }
            }

            normalized[normalizedKey] = normalizedValue;
        } else {
            normalized[normalizedKey] = value;
        }
    }

    return normalized;
}

// -----------------------------------------------------------
// CLEANUP: Keep only Today + Yesterday, Delete rest
// -----------------------------------------------------------
async function cleanupOldHourlyData() {
    const today = moment.utc().format("YYYY-MM-DD");
    const yesterday = moment.utc().subtract(1, "day").format("YYYY-MM-DD");

    // Delete everything before yesterday
    const cutoffDate = yesterday + " 00:00";

    const result = await AccountSummary.deleteMany({
        date: { $lt: cutoffDate }
    });

    console.log(`Cleanup: Kept [${yesterday}] + [${today}], Removed ${result.deletedCount} old records`);
}

// -----------------------------------------------------------
// MAIN FUNCTION
// -----------------------------------------------------------
export async function runHourlySummaryOptimized() {
    const startTime = Date.now();
    console.log("HOURLY RAW DATA COLLECTION STARTED");

    const today = moment.utc().format("YYYY-MM-DD");
    const yesterday = moment.utc().subtract(1, "day").format("YYYY-MM-DD");
    const datesToProcess = [yesterday, today];

    console.log(`Processing dates: ${yesterday} (yesterday) + ${today} (today)`);

    const clients = await clientDetails.find({
        status: "active",
        type: { $ne: "affiliate" }   // ⭐ affiliate skip
    })
    if (clients.length === 0) {
        console.log("No active clients found");
        return;
    }

    const clientIds = clients.map((c) => c._id);

    // const connections = await clientConnections
    //     .find({
    //         client_id: { $in: clientIds },
    //         network: { $in: ["shopify", "ga", "meta", "adword"] }
    //     })
    //     .select('client_id network value token')
    //     .lean();

    const connections = await clientConnections.find({
        client_id: { $in: clientIds }
    })
        .select('client_id network value token')
        .lean();
    console.log(connections, "connections")


    const connMap = new Map<string, any[]>();
    connections.forEach((c) => {
        const id = c.client_id.toString();
        if (!connMap.has(id)) connMap.set(id, []);
        connMap.get(id).push(c);
    });

    const limit = pLimit(10);

    for (const date of datesToProcess) {
        console.log(`\nProcessing date: ${date}`);

        await Promise.all(
            clients.map((client) =>
                limit(async () => {
                    const cid = client._id.toString();
                    const conns = connMap.get(cid) || [];

                    // if (conns.length === 0) return;

                    await fetchAndStoreRawData({
                        client,
                        connections: conns,
                        date,
                    });
                })
            )
        );
    }

    // Cleanup old data (before yesterday)
    await cleanupOldHourlyData();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`HOURLY RAW DATA COLLECTION FINISHED in ${duration}s`);
}

async function fetchAndStoreRawData({
    client,
    connections,
    date,
}: {
    client: any;
    connections: any[];
    date: string;
}) {
    const clientId = client._id;
    const granularity = "hourly";

    const shopifyConn = connections.find((c) => c.network === "shopify");
    const gaConn = connections.find((c) => c.network === "ga");
    const metaConn = connections.find((c) => c.network === "meta");
    const adwordConn = connections.find((c) => c.network === "adword");

    const [shopifyRaw, gaRaw, metaRaw, adwordRaw] = await Promise.all([
        safeRun(async () => {
            if (!shopifyConn) return null;
            const svc = new ShopifyService();
            return await svc.salesreport({
                storeUrl: shopifyConn.value,
                accessToken: shopifyConn.token,
                startDate: date,
                endDate: date,
                granularity,
                clientId: client._id,
                connectionId: shopifyConn._id,
            });
        }, "Shopify"),

        safeRun(async () => {
            if (!gaConn) return null;
            const svc = new analyticsDataService();
            return await svc.fetchAnalyticsReport({
                accountId: gaConn.value,
                startDate: date,
                endDate: date,
                granularity,
                clientId,
                connectionId: gaConn._id,
            });
        }, "GA"),

        safeRun(async () => {
            if (!metaConn) return null;
            const svc = new MetaService();
            return await svc.getMetaAccountData({
                accountId: metaConn.value,
                startDate: date,
                endDate: date,
                granularity,
                clientId: metaConn.client_id,
                connectionId: metaConn._id,
            });
        }, "Meta"),

        safeRun(async () => {
            if (!adwordConn) return null;
            const svc = new AdwordService();
            return await svc.adwordReport({
                customerId: adwordConn.value,
                startDate: date,
                endDate: date,
                granularity,
                clientId,
                connectionId: adwordConn._id,
            });
        }, "AdWord"),
    ]);

    // ⭐ NEW: Normalize with timezone shift handling
    const normalizeWithTimezoneShift = (data: any, requestedDate: string): Record<string, any> => {
        if (!data || typeof data !== 'object') return {};

        const normalized: Record<string, any> = {};
        const nextDate = moment.utc(requestedDate).add(1, 'day').format('YYYY-MM-DD');

        for (const [key, value] of Object.entries(data)) {
            const m = moment.utc(key);
            if (!m.isValid()) continue;

            const utcDate = m.format('YYYY-MM-DD');
            const utcHour = m.format('HH:00');
            const hourNum = parseInt(m.format('HH'));

            let finalKey: string;

            // If it's next day's early hours (00:00-05:00), map to requested date
            if (utcDate === nextDate && hourNum >= 0 && hourNum <= 5) {
                finalKey = `${requestedDate} ${utcHour}`;
            }
            // If it's the requested date, keep as is
            else if (utcDate === requestedDate) {
                finalKey = `${requestedDate} ${utcHour}`;
            }
            // Skip other dates
            else {
                continue;
            }

            if (value && typeof value === 'object') {
                const normalizedValue = { ...value as any };
                normalizedValue.date = finalKey;
                if (!normalizedValue.hour) {
                    normalizedValue.hour = `${utcHour}:00 - ${utcHour}:59:59`;
                }
                normalized[finalKey] = normalizedValue;
            } else {
                normalized[finalKey] = value;
            }
        }

        return normalized;
    };

    // Use new normalize function for Shopify (timezone issues)
    const shopifyData = normalizeWithTimezoneShift(shopifyRaw, date);

    // Regular normalize for others (they handle timezone properly)
    const gaData = normalizeDataKeys(gaRaw);
    const metaData = normalizeDataKeys(metaRaw);
    const adwordData = normalizeDataKeys(adwordRaw);

    // Filter by requested date only
    const filterByDate = (data: Record<string, any>): Record<string, any> => {
        const filtered: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith(date)) {
                filtered[key] = value;
            }
        }
        return filtered;
    };

    const filteredShopify = filterByDate(shopifyData);
    const filteredGa = filterByDate(gaData);
    const filteredMeta = filterByDate(metaData);
    const filteredAdword = filterByDate(adwordData);

    // Generate all 24 hours
    const allHours = new Set<string>();
    for (let h = 0; h < 24; h++) {
        const hourStr = h.toString().padStart(2, '0');
        allHours.add(`${date} ${hourStr}:00`);
    }

    if (allHours.size === 0) return;

    const bulkOps: any[] = [];

    for (const hour of allHours) {
        bulkOps.push({
            updateOne: {
                filter: { client_id: clientId, date: hour },
                update: {
                    $set: {
                        client_id: clientId,
                        client_name: client.name,
                        date: hour,
                        fetched_at: new Date(),
                        raw: {
                            shopify: filteredShopify[hour] ?? null,
                            ga: filteredGa[hour] ?? null,
                            meta: filteredMeta[hour] ?? null,
                            adword: filteredAdword[hour] ?? null,
                        },
                        updated_at: new Date()
                    }
                },
                upsert: true,
            },
        });
    }

    if (bulkOps.length > 0) {
        await AccountSummary.bulkWrite(bulkOps, { ordered: false });
        console.log(`✓ ${client.name}: ${bulkOps.length} records for ${date}`);
    }
}