export const to2 = (n: number) => Number((n ?? 0).toFixed(2));
export const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export const calcCpc = (spend: number, clicks: number): number => {
    return clicks > 0 ? to2(spend / clicks) : 0;
};

export const calcCtr = (clicks: number, impressions: number): number => {
    return impressions > 0 ? to2((clicks / impressions) * 100) : 0;
};

export const calcRoas = (revenue: number, spend: number): number => {
    return spend > 0 ? to2(revenue / spend) : 0;
};


export const calculateStatsFromTimeseries = (timeseries: Record<string, any>): Record<string, number> => {
    let revenue = 0;
    let spend = 0;
    let clicks = 0;
    let outbound_clicks = 0;
    let impressions = 0;
    let sessions = 0;
    let transactions = 0;
    let newUsers = 0;
    let userEngagementDuration = 0;

    // For weighted averages
    let wBounceNumer = 0;
    let wConvNumer = 0;
    let wAvgSessDurNumer = 0;
    let wPageViewsPerSessNumer = 0;

    // console.log(timeseries, "timeserieslogss")

    Object.values(timeseries).forEach((data: any) => {
        if (!data || data.error) return;

        const dataRevenue = Number(data.revenue || 0);
        const dataSpend = Number(data.spend || 0);
        const dataClicks = Number(data.clicks || 0);
        const dataOutboundClicks = Number(data.outbound_clicks || 0);
        const dataImpressions = Number(data.impressions || 0);
        const dataSessions = Number(data.sessions || 0);
        const dataTransactions = Number(data.transactions || 0);
        const dataNewUsers = Number(data.newUsers || 0);
        const dataUED = Number(data.userEngagementDuration || 0);

        revenue += dataRevenue;
        spend += dataSpend;
        clicks += dataClicks;
        outbound_clicks += dataOutboundClicks;
        impressions += dataImpressions;
        sessions += dataSessions;
        transactions += dataTransactions;
        newUsers += dataNewUsers;
        userEngagementDuration += dataUED;

        // Weighted by sessions (for GA metrics)
        wBounceNumer += Number(data.bounceRate || 0) * dataSessions;
        wConvNumer += Number(data.conversionRate || 0) * dataSessions;
        wAvgSessDurNumer += Number(data.averageSessionDuration || 0) * dataSessions;
        wPageViewsPerSessNumer += Number(data.screenPageViewsPerSession || 0) * dataSessions;
    });

    const effectiveClicks = outbound_clicks || clicks;
    // console.log(revenue, "revenue")

    return {
        revenue: Number(revenue.toFixed(2)),
        spend: Number(spend.toFixed(2)),
        clicks: Number(clicks.toFixed(2)),
        outbound_clicks: Number(outbound_clicks.toFixed(2)),
        impressions: Number(impressions.toFixed(2)),
        sessions: Number(sessions.toFixed(2)),
        transactions: Number(transactions.toFixed(2)),
        newUsers: Number(newUsers.toFixed(2)),
        userEngagementDuration: Number(userEngagementDuration.toFixed(2)),

        // Ad metrics
        cpc: effectiveClicks > 0 ? Number((spend / effectiveClicks).toFixed(2)) : 0,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,

        // GA metrics (weighted averages)
        bounceRate: sessions > 0 ? Number((wBounceNumer / sessions).toFixed(2)) : 0,
        conversionRate: sessions > 0 ? Number((wConvNumer / sessions).toFixed(2)) : 0,
        averageSessionDuration: sessions > 0 ? Number((wAvgSessDurNumer / sessions).toFixed(2)) : 0,
        screenPageViewsPerSession: sessions > 0 ? Number((wPageViewsPerSessNumer / sessions).toFixed(2)) : 0
    };
};


export const calculateAggregatedShopifyRevenue = (
    aggregated: {
        gross_sales: number;
        discounts: number;
        shipping_charges: number;
        taxes: number;
        returns: number;
    },
    formula: string
): number => {
    if (!formula || typeof formula !== "string") {
        return aggregated.gross_sales - aggregated.discounts;
    }

    const map: Record<string, number> = {
        "G": aggregated.gross_sales,
        "D": aggregated.discounts,
        "S": aggregated.shipping_charges,
        "T": aggregated.taxes,
        "R": aggregated.returns,
    };

    let result = 0;
    let currentOp = "+";

    // ⭐ Debug: Log each step
    // console.log("Formula:", formula);
    // console.log("Map:", map);

    for (const char of formula) {
        // console.log(`Char: "${char}", CurrentOp: "${currentOp}"`);

        if (char === "+" || char === "-") {
            currentOp = char;
            continue;
        }

        const val = map[char] ?? 0;
        // console.log(`Value for ${char}: ${val}`);

        if (currentOp === "+") {
            result += val;
        } else {
            result -= val;
        }

        // console.log(`Result after ${char}: ${result}`);
    }

    // console.log("Final Result:", result);
    return result;
};