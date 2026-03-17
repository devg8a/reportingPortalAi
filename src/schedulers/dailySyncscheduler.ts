import clientConnections from "../db/models/clientConnections";
import clientDetails from "../db/models/clientDetails";
import logger from "../utils/logger";
import schedularLogs from "../db/models/schedularLogs";
import { NETWORK_REGISTRY } from "../config/networkRegistry";
import { checkKlaviyoDailyLimit,checkAwinLimit } from '../services/rateLimit.service';

// RETRY
async function retry(fn: Function, retries: number = 2) {
    const RETRY_HTTP_CODES = [500, 502, 503, 504];
    try {
        return await fn();
    } catch (err) {
        const error_code = err?.status || 500;
        const isRetryable = RETRY_HTTP_CODES.includes(error_code);
        if (retries <= 0 || !isRetryable) throw err;
        // console.log("Retrying...");
        return retry(fn, retries - 1);
    }
}

// SAFE RUN
const safeRun = async (fn: Function, requestData: any) => {
    
    const log = await schedularLogs.insertOne({
        client_id: requestData?.clientId,
        connection_id: requestData?.connectionId,
        network: requestData?.network,
        type: "dailyschedular",
        start_date: requestData?.startDate,
        end_date: requestData?.endDate,
        status: "processing",
    });

    try {
        // console.log(`→ Running ${requestData?.network}`);
        if (requestData?.network === 'awin') {
            const allowed = await checkAwinLimit();
            if (!allowed) {
                await new Promise(r => setTimeout(r, 60001));
            }
        }

        await retry(fn);
        // console.log(`✔ Completed ${requestData?.network}`);
        // console.log(`→ logId ${logId}`);
        await schedularLogs.updateOne(
            { _id: log._id },
            { $set: { status: "completed" } }
        );
    } catch (error) {
        // console.log(`✖ Error in ${requestData?.network}`, error);
        await schedularLogs.updateOne(
            { _id: log._id },
            { $set: { status: "error", error } }
        );
    }
};

type DateRange = {
    start_date: string;
    end_date: string;
};

// MAIN FUNCTION
export async function runDailyRefresh(range?: DateRange) {
    await updateBackDataSyncStatus();
    const { start_date, end_date } = range ?? {start_date:getDaysAgo(31).toISOString().slice(0, 10),end_date:getDaysAgo(1).toISOString()
        .slice(0, 10)};

    const requestDateRange = {
        startDate: start_date,
        endDate: end_date,
    };

    const allConnections = await clientConnections.aggregate([
        {
            $match: { status: "active" }
        },
        {
            $lookup: {
                from: clientDetails.collection.name,
                localField: "client_id",
                foreignField: "_id",
                as: "client"
            }
        },
        { $unwind: "$client" },
        { $match: { "client.status": "active" } },
        {
            $project: {
                _id: 1,
                client_id: 1,
                network: 1,
                value: 1,
                token: 1,
                timezone: 1,
                program_id: 1,
                is_backed_data_synced: 1,

                client: {
                    name: "$client.name",
                    type: "$client.type"
                }
            }
        },
        { $sort: { client_id: 1 } }
    ]);
    
    if (allConnections.length) {
        await Promise.allSettled(
            allConnections.map((conn) => {
                const networkConfig = NETWORK_REGISTRY[conn.network];
                if (!networkConfig) {
                    console.log("Unknown network:", conn.network);
                    return Promise.resolve();
                }

                const reqData: any = {
                    ...requestDateRange,
                    ...networkConfig.buildParams(conn)
                };
                const fn = () => networkConfig.service[networkConfig.method](reqData);
                return safeRun(fn, reqData);
            })
        );

        /**Historical Data Refresh **/
        let pendingBackfillConnections = allConnections.filter(conn => !conn.is_backed_data_synced);
        if (!pendingBackfillConnections.length) return;

        const scheduledList = await schedularLogs.find({ type: "historicalDataSchedular", status: { $ne: "completed" } }).lean();
        const scheduledConnectionIds = new Set(
            scheduledList.map(v => v.connection_id?.toString())
        );

        pendingBackfillConnections = pendingBackfillConnections.filter(
            conn => !scheduledConnectionIds.has(conn._id.toString())
        );
        if (!pendingBackfillConnections.length) return;

        /* ---------------- DATE RANGES (compute once) ---------------- */
        const lastTwoYearDate     = getYearsAgo();
        const beforeThityDaysDate = getDaysAgo();
        const yearlyRanges        = buildYearlyRanges(2);
        const monthlyRanges       = buildMonthlyRanges(2);
        const sixMonthRanges      = buildSixMonthRanges(2);

        /* ---------------- NETWORK STRATEGY ---------------- */
        const networkStrategy: Record<string, any> = {
            shopify   : "single",
            meta      : "single",
            adword    : "single",
            rakuten   : "single",
            ga        : yearlyRanges,
            bing      : yearlyRanges,
            impact    : yearlyRanges,
            avantlink : yearlyRanges,
            levanta   : yearlyRanges,
            klaviyo   : monthlyRanges,
            awin      : monthlyRanges,
            cj        : monthlyRanges,
            pepperjam : sixMonthRanges,
            criteo    : "criteo"
        };

        /* ---------------- PAYLOAD BUILDER ---------------- */
        const bulkInsertPayload: any[] = [];
        for (const connection of pendingBackfillConnections) {

            const strategy = networkStrategy[connection.network];
            if (!strategy) {
                logger.warn(`No handler found for network: ${connection.network}`);
                continue;
            }

            const basePayload = {
                client_id     : connection.client_id,
                connection_id : connection._id,
                type          : "historicalDataSchedular",
                network       : connection.network,
                status        : "pending"
            };

            // SINGLE RANGE
            if (strategy === "single") {
                bulkInsertPayload.push({
                    ...basePayload,
                    start_date: lastTwoYearDate,
                    end_date  : beforeThityDaysDate
                    });
                continue;
            }

            // CRITEO SPECIAL RULE
            if (strategy === "criteo") {
                bulkInsertPayload.push({
                    ...basePayload,
                    start_date: getYearsAgo(2, "fromToday"),
                    end_date  : beforeThityDaysDate
                    });
                continue;
            }

            // RANGE BASED
            for (const range of strategy) {
                bulkInsertPayload.push({
                    ...basePayload,
                    start_date: range.startDate,
                    end_date  : range.endDate
                });
            }
        }

        /* ---------------- BULK INSERT ---------------- */
        if (bulkInsertPayload.length) {
            await schedularLogs.insertMany(bulkInsertPayload);
        }
    }else{
        logger.info("No Network Accounts to run!!");
    }
    logger.info("\nDaily REFRESH FINISHED");
}

const updateBackDataSyncStatus = async () => {
    const completed = await schedularLogs.distinct(
        "connection_id",
        {
            type: "historicalDataSchedular",
            status: "completed"
        }
    );

    if (!completed.length) return;

    const pending = new Set(
        await schedularLogs.distinct(
            "connection_id",
            {
                type: "historicalDataSchedular",
                status: { $ne: "completed" }
            }
        )
    );

    const finalIds =
        completed.filter(id => !pending.has(id));

    if (finalIds.length) {
        await clientConnections.updateMany(
            { _id: { $in: finalIds } },
            { $set: { is_backed_data_synced: true } }
        );
    }
    await schedularLogs.deleteMany({ status: "completed" });
};

function getYearsAgo(yearsBack = 2, type = "firstMonth"): Date {
    const now = new Date();
    if (type == "fromToday") {
        now.setFullYear(now.getFullYear() - yearsBack);
        return now;
    } else {
        return new Date(Date.UTC(now.getFullYear() - yearsBack, 0, 1));
    }
}

function getDaysAgo(daysBack = 30): Date {
    const now = new Date();
    const utcDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysBack
    ));
    return utcDate;
}

function buildYearlyRanges(yearsBack: number) {
    const now = new Date();

    const currentYear = now.getUTCFullYear();
    const startYear = currentYear - yearsBack;

    // 30 days before today (UTC safe)
    const thirtyDaysAgo = new Date(
        now.getTime() - (30 * 24 * 60 * 60 * 1000)
    );

    const ranges: { startDate: Date; endDate: Date }[] = [];

    for (let year = startYear; year <= currentYear; year++) {
        const startDate = new Date(Date.UTC(year, 0, 1));

        let endDate: Date;

        if (year === currentYear) {
            endDate = thirtyDaysAgo;
        } else {
            endDate = new Date(Date.UTC(year, 11, 31)); // Dec 31
        }

        ranges.push({ startDate, endDate });
    }

    return ranges;
}

function buildMonthlyRanges(yearsBack: number) {
    const now = new Date();

    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-based

    const startYear = currentYear - yearsBack;

    const ranges: { startDate: Date; endDate: Date }[] = [];

    // Loop from start year Jan (0)
    let year = startYear;
    let month = 0;

    while (
        year < currentYear ||
        (year === currentYear && month < currentMonth)
    ) {
        const startDate = new Date(Date.UTC(year, month, 1));

        // Last day of month trick:
        const endDate = new Date(Date.UTC(year, month + 1, 0));

        ranges.push({ startDate, endDate });

        month++;

        if (month > 11) {
            month = 0;
            year++;
        }
    }

    return ranges;
}


function buildSixMonthRanges(yearsBack: number) {
  const now = new Date();
  const start = new Date();
  start.setUTCFullYear(now.getUTCFullYear() - yearsBack);
  start.setUTCMonth(0);
  start.setUTCDate(1);

  const ranges: { startDate: Date; endDate: Date }[] = [];

  let cursor = new Date(start);

  while (cursor < now) {

    const rangeStart = new Date(cursor);

    const rangeEnd = new Date(cursor);
    rangeEnd.setUTCMonth(rangeEnd.getUTCMonth() + 6);
    rangeEnd.setUTCDate(0);

    if (rangeEnd > now) {
      ranges.push({ startDate: rangeStart, endDate: now });
      break;
    }

    ranges.push({ startDate: rangeStart, endDate: rangeEnd });

    cursor.setUTCMonth(cursor.getUTCMonth() + 6);
  }

  return ranges;
}