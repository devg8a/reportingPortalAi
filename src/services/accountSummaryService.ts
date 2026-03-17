import clientConnections from "../db/models/clientConnections";
import clientDetails from "../db/models/clientDetails";

import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import { analyticsDataService } from "../liberaries/PaidMedia/GA4/analyticsDataLib";
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";
import pLimit from "p-limit";
import moment from "moment";
import AccountSummary from "../db/models/AccountSummary";
import mongoose from "mongoose"; // if not already imported in this file
import PerformanceEntitiesSchema from "../db/models/performanceEntity";
import PerformanceClientDetail from "../db/models/performanceClientDetail";
import { calculateAggregatedShopifyRevenue } from "../helper/metricsHelper";
import { fetchClientById } from "../helper/utilityHelper";


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


    // const today = "2026-02-09";
    // const yesterday = "2026-02-09";

    const datesToProcess = [yesterday, today];

    // console.log(`Processing dates: ${yesterday} (yesterday) + ${today} (today)`);

    const clients = await clientDetails.find({
        status: "active",
        $or: [
            { type: 'paid_media' },
            { type: { $in: ['paid_media'] } } // if array
        ]
    })
    if (clients.length === 0) {
        console.log("No active clients found");
        return;
    }

    const clientIds = clients.map((c) => c._id);


    const connections = await clientConnections.find({
        client_id: { $in: clientIds },
        status: "active",
        network: { $in: ["shopify", "ga", "meta", "adword"] }
    })
        .select('client_id network value token')
        .lean();


    const connMap = new Map<string, any[]>();
    connections.forEach((c) => {
        const id = c.client_id.toString();
        if (!connMap.has(id)) connMap.set(id, []);
        connMap.get(id).push(c);
    });

    const limit = pLimit(10);

    for (const date of datesToProcess) {
        // console.log(`\nProcessing date: ${date}`);

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


const normalizeWithTimezoneShift = (
    data: any,
    requestedDate: string
): Record<string, any> => {

    if (!data || typeof data !== "object") return {};

    const normalized: Record<string, any> = {};
    const nextDate = moment.utc(requestedDate).add(1, "day").format("YYYY-MM-DD");

    for (const [key, value] of Object.entries(data)) {

        const m = moment.utc(key);
        if (!m.isValid()) continue;

        const utcDate = m.format("YYYY-MM-DD");
        const utcHour = m.format("HH:00");
        const hourNum = parseInt(m.format("HH"));

        let finalKey: string;

        // Next day early hours → map back
        if (utcDate === nextDate && hourNum >= 0 && hourNum <= 5) {
            finalKey = `${requestedDate} ${utcHour}`;
        }
        else if (utcDate === requestedDate) {
            finalKey = `${requestedDate} ${utcHour}`;
        }
        else {
            continue;
        }

        if (value && typeof value === "object") {
            const normalizedValue = { ...(value as any) };
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



const filterByDate = (
    data: Record<string, any>,
    requestedDate: string
): Record<string, any> => {

    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(data || {})) {

        const dateOnly = key.split(" ")[0].split("T")[0];

        if (dateOnly === requestedDate) {
            filtered[key] = value;
        }
    }

    return filtered;
};


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

    // ✅ MULTI CONNECTION SUPPORT
    const shopifyConn = connections.find(c => c.network?.toLowerCase() === "shopify");
    const gaConn = connections.find(c => c.network?.toLowerCase() === "ga");

    const metaConns = connections.filter(c => c.network?.toLowerCase() === "meta");
    const adwordConns = connections.filter(c => c.network?.toLowerCase() === "adword");

    // ------------------------------------------------
    // FETCH ALL NETWORK RAW DATA
    // ------------------------------------------------
    const [shopifyRaw, gaRaw, metaRawList, adwordRawList] = await Promise.all([

        // SHOPIFY (Single)
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

        // GA (Single)
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

        // META (MULTI)
        Promise.all(
            metaConns.map(conn =>
                safeRun(async () => {
                    const svc = new MetaService();
                    return await svc.getMetaAccountData({
                        accountId: conn.value,
                        startDate: date,
                        endDate: date,
                        granularity,
                        clientId: conn.client_id,
                        connectionId: conn._id,
                    });
                }, `Meta-${conn._id}`)
            )
        ),

        // ADWORD (MULTI)
        Promise.all(
            adwordConns.map(conn =>
                safeRun(async () => {
                    const svc = new AdwordService();
                    return await svc.adwordReport({
                        customerId: conn.value,
                        startDate: date,
                        endDate: date,
                        granularity,
                        clientId,
                        connectionId: conn._id,
                    });
                }, `Adword-${conn._id}`)
            )
        )
    ]);

    // ------------------------------------------------
    // 🔥 MERGE MULTI ACCOUNT DATA
    // ------------------------------------------------
    const mergeHourlyObjects = (list: any[]) => {
        const merged: Record<string, any> = {};

        list?.forEach(obj => {
            if (!obj) return;

            Object.entries(obj).forEach(([hour, val]: any) => {
                if (!merged[hour]) merged[hour] = { ...val };
                else {
                    Object.keys(val || {}).forEach(k => {
                        if (typeof val[k] === "number") {
                            merged[hour][k] = (merged[hour][k] || 0) + val[k];
                        }
                    });
                }
            });
        });

        return merged;
    };

    const metaRaw = mergeHourlyObjects(metaRawList);
    const adwordRaw = mergeHourlyObjects(adwordRawList);



    // ------------------------------------------------
    // NORMALIZE
    // ------------------------------------------------
    const shopifyData = normalizeWithTimezoneShift(shopifyRaw, date);
    const gaData = normalizeDataKeys(gaRaw);
    const metaData = normalizeDataKeys(metaRaw);
    const adwordData = normalizeDataKeys(adwordRaw);

    const filteredShopify = filterByDate(shopifyData, date);
    const filteredGa = filterByDate(gaData, date);
    const filteredMeta = filterByDate(metaData, date);
    const filteredAdword = filterByDate(adwordData, date);

    // ------------------------------------------------
    // HOURS GENERATE
    // ------------------------------------------------
    const allHours = new Set<string>();
    let maxHour = 23;

    const isToday = moment.utc().format("YYYY-MM-DD") === date;
    if (isToday) maxHour = moment.utc().hour();

    for (let h = 0; h <= maxHour; h++) {
        const hourStr = h.toString().padStart(2, '0');
        allHours.add(`${date} ${hourStr}:00`);
    }

    // ------------------------------------------------
    // SAVE BULK
    // ------------------------------------------------
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

    if (bulkOps.length) {
        await AccountSummary.bulkWrite(bulkOps, { ordered: false });
        console.log(`✅ ${client.name}: ${bulkOps.length} hourly rows saved (${date})`);
    }
}




function matchEntityByText(text: string, entities: any[]): any | null {
    if (!text) return null;
    const name = text.toLowerCase();

    let best: any = null;
    let bestScore = 0;

    for (const e of entities) {
        const group = String(e.group_name || '').toLowerCase();
        const ent = String(e.entity_name || '').toLowerCase();
        if (!group || !ent) continue;

        // Group word must appear somewhere
        if (!name.includes(group)) continue;

        let score = 0;

        // Full entity phrase match → sabse strong
        if (name.includes(ent)) {
            score = ent.length;
        } else {
            // Otherwise word-wise match
            const words = ent.split(/\s+/).filter(Boolean);
            let hits = 0;
            for (const w of words) {
                if (name.includes(w)) hits++;
            }
            if (!hits) continue;
            score = hits * 5;
        }

        if (score > bestScore) {
            bestScore = score;
            best = e;
        }
    }

    return best;
}



// ======================================================================
// CRON: PERFORMANCE CLIENT DETAIL (ONLY FOR 2 FIXED CLIENTS)
// ======================================================================

async function runPerformanceDetailForClient(clientId: string) {
    const startTime = Date.now();

    try {
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            console.error(`[PerfCron] Invalid client_id: ${clientId}`);
            return;
        }

        // ============ CLIENT + REVENUE FORMULA ============
        const client = await fetchClientById(clientId);
        if (!client) {
            console.error(`[PerfCron] Client not found: ${clientId}`);
            return;
        }

        const isSpecialClient = client?.name === "Urban Savage";   // <-- ADD THIS

        // ============ MONTHLY DATE LOGIC ============
        const today = moment().startOf('day');
        let startMoment: moment.Moment;
        let endMoment: moment.Moment;

        if (today.date() === 1) {
            // Agar aaj 1 hai → previous month ka full range
            const prevMonth = today.clone().subtract(1, 'month');
            startMoment = prevMonth.clone().startOf('month');
            endMoment = prevMonth.clone().endOf('month');
        } else {
            // Warna current month ka 1 se kal tak
            startMoment = today.clone().startOf('month');
            endMoment = today.clone().subtract(1, 'day');
        }

        const start_date = startMoment.format('YYYY-MM-DD');
        const end_date = endMoment.format('YYYY-MM-DD');
        // const start_date = "2026-01-01";
        // const end_date = "2026-01-31";

        console.log(start_date, end_date, "start_date, end_date")

        // Monthly key: YYYY-MM (yehi DB me save hoga)
        const month_key = moment(start_date, "YYYY-MM-DD").format("YYYY-MM");

        // ============ CONNECTIONS + ENTITIES (Parallel) ============
        let [connections, entities] = await Promise.all([
            clientConnections.find({
                client_id: new mongoose.Types.ObjectId(clientId)
            })
                .select("_id network value token account_name shopify_revenue_settings")
                .lean(),

            PerformanceEntitiesSchema.find({
                client_id: new mongoose.Types.ObjectId(clientId)
            }).lean()
        ]);

        const shopifyConnection = connections.find(
            (c: any) => c.network?.toLowerCase() === "shopify"
        );
        const revenueFormula =
            shopifyConnection?.shopify_revenue_settings?.account_summary || "G-D+S+T";

        if (!entities.length) {
            console.warn(
                `[PerfCron] No entities found for client_id=${clientId}. Falling back to global entities.`
            );
            entities = await PerformanceEntitiesSchema.find({}).lean();
        }

        if (!entities.length) {
            console.warn(`[PerfCron] No performance entities found at all, skipping client ${clientId}`);
            return;
        }

        // ============ META IDS BY LABEL ============
        const metaIdsByLabel: Record<string, Set<string>> = {
            main_account: new Set(),
            nba: new Set(),
            nhl: new Set(),
            mlb: new Set(),
            nfl: new Set(),
        };

        if (!isSpecialClient) {
            entities.forEach(e => {
                if (!e.meta) return;
                Object.entries(e.meta).forEach(([k, v]) => {
                    if (!metaIdsByLabel[k]) return;
                    String(v)
                        .split(",")
                        .map(x => x.trim())
                        .filter(x => x.length > 0)
                        .forEach(id => metaIdsByLabel[k].add(id));
                });
            });
        }

        const adwordSvc = new AdwordService();
        const shopifySvc = new ShopifyService();

        const nameMap: Record<string, string> = {
            main_account: "Main account",
            nba: "NBA",
            nhl: "NHL",
            mlb: "MLB",
            nfl: "NFL"
        };

        // ============ FIND CONNECTIONS ============
        const adwordConn = isSpecialClient
            ? null
            : connections.find(c => c.network === "adword");
        const shopifyConn = connections.find(c => c.network === "shopify");

        // ============ ALL API CALLS IN PARALLEL ============

        const metaSvc = new MetaService();
        let metaResults: { label: string; data: any[] }[] = [];

        if (!isSpecialClient) {
            const metaPromises = Object.keys(metaIdsByLabel).map(async label => {
                const ids = [...metaIdsByLabel[label]];
                if (!ids.length) return { label, data: [] };

                const conn = connections.find(
                    c =>
                        c.network === "meta" &&
                        c.account_name?.toLowerCase() === nameMap[label]?.toLowerCase()
                );
                if (!conn) return { label, data: [] };

                try {
                    const data = await metaSvc.getMetaAdData({
                        accountId: conn.value,
                        adId: ids,
                        startDate: start_date,
                        endDate: end_date
                    });

                    // 🔍 NEW ADS LOG – sirf console, koi save nahi
                    try {
                        const newAds = await metaSvc.fetchNewAds({
                            accountId: conn.value,
                            startDate: start_date,
                            endDate: end_date
                        });
                        console.log(
                            `[PerfCron] Meta New Ads (label=${label}, client=${clientId}) count=${newAds?.length || 0}`
                        );
                        console.log(JSON.stringify(newAds || [], null, 2));
                    } catch (fetchErr: any) {
                        console.error(
                            `❌ [PerfCron] Meta fetchNewAds Error (${label}, client=${clientId}):`,
                            fetchErr?.message || fetchErr
                        );
                    }

                    return { label, data: data || [] };
                } catch (err: any) {
                    console.error(`❌ [PerfCron] Meta API Error (${label}, client=${clientId}):`, err.message);
                    return { label, data: [] };
                }
            });

            metaResults = await Promise.all(metaPromises);
        } else {
            const metaConn = connections.find(c => c.network === "meta");
            if (metaConn) {
                try {
                    const data = await metaSvc.getMetaAdData({
                        accountId: metaConn.value,
                        startDate: start_date,
                        endDate: end_date,
                        skipAdIdFilter: true,
                        nameContains: 'Jacket'
                    });

                    // 🔍 NEW ADS LOG – sirf console, koi save nahi
                    try {
                        const newAds = await metaSvc.fetchNewAds({
                            accountId: metaConn.value,
                            startDate: start_date,
                            endDate: end_date
                        });
                        console.log(
                            `[PerfCron] Meta New Ads (special client=${clientId}) count=${newAds?.length || 0}`
                        );
                        console.log(JSON.stringify(newAds || [], null, 2));
                    } catch (fetchErr: any) {
                        console.error(
                            `❌ [PerfCron] Meta fetchNewAds Error (special client=${clientId}):`,
                            fetchErr?.message || fetchErr
                        );
                    }

                    metaResults = [{ label: 'all', data: data || [] }];
                } catch (err: any) {
                    console.error(`❌ [PerfCron] Meta API Error (special client=${clientId}):`, err.message);
                    metaResults = [];
                }
            } else {
                console.warn(`[PerfCron] No Meta connection for special client ${clientId}`);
            }
        }

        const adwordPromise = (async () => {
            if (!adwordConn) return null;
            try {
                return await adwordSvc.performanceReport({
                    customerId: adwordConn.value,
                    startDate: start_date,
                    endDate: end_date,
                    adGroupIds: [],
                    assetGroupIds: []
                });
            } catch (err: any) {
                console.error(`❌ [PerfCron] AdWord API Error (client=${clientId}):`, err.message);
                return null;
            }
        })();

        const shopifyPromise = (async () => {
            if (!shopifyConn || !shopifyConn.token) return [];
            try {
                return await shopifySvc.PerformanceReport({
                    storeUrl: shopifyConn.value,
                    accessToken: shopifyConn.token,
                    startDate: start_date,
                    endDate: end_date
                });
            } catch (err: any) {
                console.error(`❌ [PerfCron] Shopify API Error (client=${clientId}):`, err.message);
                return [];
            }
        })();

        const [adwordData, shopifyData] = await Promise.all([
            adwordPromise,
            shopifyPromise
        ]);

        // ============ FINAL RESPONSE OBJECTS ============
        const meta_response: any = {};
        const adword_response: any = {};
        const shopify_response: any = {};

        // (Optional: totals sirf logging ke liye rakh sakte ho)
        let total_meta_revenue = 0;
        let total_meta_spend = 0;
        let total_adword_revenue = 0;
        let total_adword_spend = 0;
        let total_shopify_revenue = 0;

        // ----- META -----
        metaResults.forEach(({ data }) => {
            if (!data || !Array.isArray(data)) return;

            data.forEach((ad: any) => {
                const date = ad.date_start;
                if (!date) return;

                let entity: any;

                if (isSpecialClient) {
                    // New: match by ad_name (group + entity words)
                    entity = matchEntityByText(ad.ad_name || '', entities);
                } else {
                    // Old: match by configured meta IDs
                    entity = entities.find(e =>
                        Object.values(e.meta || {})
                            .flatMap(v => String(v).split(",").map(x => x.trim()))
                            .includes(String(ad.ad_id))
                    );
                }

                if (!entity) return;

                const group = entity.group_name;
                const entityName = entity.entity_name;

                if (!meta_response[date]) meta_response[date] = {};
                if (!meta_response[date][group]) meta_response[date][group] = {};
                if (!meta_response[date][group][entityName]) {
                    meta_response[date][group][entityName] = {
                        revenue: 0,
                        spend: 0,
                        revenue_7d_click: 0,
                        revenue_1d_view: 0
                    };
                }

                const node = meta_response[date][group][entityName];

                const spend = Number(ad.spend || 0);
                node.spend += spend;
                total_meta_spend += spend;

                // yahi se omni_purchase + action_values nikaal rahe ho
                const purchase = ad.action_values?.find(
                    (a: any) => a.action_type === "omni_purchase"
                );
                if (purchase) {
                    const baseRev = Number(purchase.value || 0);
                    const rev7dClick = Number(purchase["7d_click"] || 0);
                    const rev1dView = Number(purchase["1d_view"] || 0);

                    // ✅ DIRECT STORE (NO SUM)
                    node.revenue = baseRev;
                    node.revenue_7d_click = rev7dClick;
                    node.revenue_1d_view = rev1dView;

                }
            });
        });


        // ----- ADWORD -----
        adwordData?.adGroups?.forEach((row: any) => {
            const date = row.segments?.date;
            if (!date) return;

            const entity = entities.find(e =>
                String(e.adword?.ad_group_id || "")
                    .split(",")
                    .map(id => id.trim())
                    .includes(String(row.ad_group.id))
            );
            if (!entity) return;

            const group = entity.group_name;
            const entityName = row.ad_group.name.includes(" - ")
                ? row.ad_group.name.split(" - ").slice(1).join(" - ")
                : row.ad_group.name;

            if (!adword_response[date]) adword_response[date] = {};
            if (!adword_response[date][group]) adword_response[date][group] = {};
            if (!adword_response[date][group][entityName]) {
                adword_response[date][group][entityName] = {
                    revenue: 0,
                    spend: 0
                };
            }

            const spend = Number(row.metrics.cost_micros || 0) / 1e6;
            adword_response[date][group][entityName].spend += spend;
            total_adword_spend += spend;

            const revenue = Number(row.metrics.conversions_value || 0);
            if (revenue > 0) {
                adword_response[date][group][entityName].revenue += revenue;
                total_adword_revenue += revenue;
            }
        });



        // ----- SHOPIFY -----
        if (shopifyData && Array.isArray(shopifyData)) {
            shopifyData.forEach((row: any) => {
                const date = row.day;
                const productTitle = row.product_title;
                if (!date || !productTitle) return;

                let entity: any;
                if (isSpecialClient) {
                    entity = matchEntityByText(productTitle, entities);
                } else {
                    entity = entities.find(e =>
                        productTitle.toLowerCase().includes(e.entity_name.toLowerCase())
                    );
                }
                if (!entity) return;

                const group = entity.group_name;
                const entityName = entity.entity_name;

                if (!shopify_response[date]) shopify_response[date] = {};
                if (!shopify_response[date][group]) shopify_response[date][group] = {};
                if (!shopify_response[date][group][entityName]) {
                    shopify_response[date][group][entityName] = {
                        revenue: 0
                    };
                }

                // ✅ AFTER - Added net_sales
                const revenue = calculateAggregatedShopifyRevenue(
                    {
                        gross_sales: Number(row.gross_sales || 0),
                        discounts: Number(row.discounts || 0),
                        shipping_charges: Number(row.shipping_charges || 0),
                        taxes: Number(row.taxes || 0),
                        returns: Number(row.returns || 0),
                        net_sales: Number(row.net_sales || 0),  // ✅ ADD THIS LINE
                    },
                    revenueFormula
                );

                shopify_response[date][group][entityName].revenue += revenue;
                total_shopify_revenue += revenue;
            });
        }
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(
            `✅ [PerfCron] Client ${clientId} processed in ${duration}s, range ${start_date} to ${end_date}, month_key=${month_key}`
        );
        console.log(
            `   META: revenue=${total_meta_revenue.toFixed(2)}, spend=${total_meta_spend.toFixed(2)} | ADWORD: revenue=${total_adword_revenue.toFixed(2)}, spend=${total_adword_spend.toFixed(2)} | SHOPIFY: revenue=${total_shopify_revenue.toFixed(2)}`
        );

        // ======= SAVE SNAPSHOT TO performance_client_details =======
        try {
            await PerformanceClientDetail.findOneAndUpdate(
                {
                    // Existing doc ko year_month se find karo (per client+month 1 doc)
                    client_id: new mongoose.Types.ObjectId(clientId),
                    year_month: month_key
                },
                {
                    // Naye values set karo (existing doc update ho jayega, nahi hai to insert)
                    client_id: new mongoose.Types.ObjectId(clientId),
                    year_month: month_key,

                    // yahan se extra fields:
                    date: start_date,      // 👈 important: unique index ko satisfy karega
                    start_date,
                    end_date,
                    data: {
                        meta_response,
                        adword_response,
                        shopify_response
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
            console.log(`[PerfCron] Snapshot saved for client ${clientId} (month=${month_key})`);
        } catch (saveErr: any) {
            console.error(
                `[PerfCron] Failed to save PerformanceClientDetail snapshot for client ${clientId}:`,
                saveErr.message
            );
        }
    } catch (error: any) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(
            `❌ [PerfCron] Error for client ${clientId} after ${duration}s:`,
            error.message
        );
    }
}

// Public cron function: run for fixed client IDs

export async function getPerformanceClientDetailCrone() {
    // const clientIds = [
    //     "6979ee13c7c7b575bab41b52",
    //     "696f6ddf7b7caae18d0e7cda"
    // ];

    console.log(`[PerfCron] Finding clients by name: "Urban Savage", "Pro Standard"`);

    try {
        const clients = await clientDetails.find({
            name: { $in: ["Urban Savage", "Pro Standard"] },
            status: "active"
        }).select("_id name").lean();

        if (!clients.length) {
            console.log("[PerfCron] No matching clients found.");
            return;
        }

        const clientIds = clients.map(c => c._id.toString());
        console.log(`[PerfCron] Starting performance detail cron for clients: ${clientIds.join(", ")}`);

        for (const cid of clientIds) {
            await runPerformanceDetailForClient(cid);
        }

        console.log("[PerfCron] All fixed clients processed.");

    } catch (error: any) {
        console.error("[PerfCron] Error searching for clients:", error.message);
    }
}