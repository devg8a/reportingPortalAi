const MONTHS = ["Oct 2024", "Nov 2024", "Dec 2024", "Jan 2025", "Feb 2025", "Mar 2025"];
const COMP_MONTHS = ["Oct 2023", "Nov 2023", "Dec 2023", "Jan 2024", "Feb 2024", "Mar 2024"];

export const CHART_CATEGORIES = MONTHS;
export const CHART_COMPARISON_LABELS = COMP_MONTHS;

export const CHART_SERIES_DATA = {
    revenue: [42500, 48200, 63100, 39800, 45600, 52300],
    shopify_revenue: [38200, 43500, 57800, 35600, 41200, 47800],
    spend: [8500, 9200, 12400, 7800, 8900, 10200],
    roas: [5.0, 5.24, 5.09, 5.1, 5.12, 5.13],
    sessions: [4563, 5120, 6840, 4210, 4890, 5430],
    clicks: [3200, 3650, 4820, 2980, 3410, 3890],
    cpc: [2.66, 2.52, 2.57, 2.62, 2.61, 2.62],
};

export const CHART_COMPARISON_DATA = {
    revenue: [6200, 7100, 8400, 5800, 6500, 7200],
    shopify_revenue: [5500, 6300, 7600, 5200, 5800, 6500],
    spend: [3100, 3400, 4200, 2900, 3200, 3600],
    roas: [2.0, 2.09, 2.0, 2.0, 2.03, 2.0],
    sessions: [921, 1050, 1380, 840, 960, 1100],
    clicks: [680, 780, 920, 630, 720, 810],
    cpc: [4.56, 4.36, 4.57, 4.6, 4.44, 4.44],
};

interface DummyRow {
    [key: string]: string | number;
    id: string;
    period: string;
    orders: number;
    orders_prev: number;
    gross_sales: number;
    gross_sales_prev: number;
    discount: number;
    discount_prev: number;
    revenue: number;
    revenue_prev: number;
    sessions: number;
    sessions_prev: number;
    conv_rate: number;
    conv_rate_prev: number;
    aov: number;
    aov_prev: number;
    discount_pct: number;
    discount_pct_prev: number;
    spend: number;
    spend_prev: number;
    clicks: number;
    clicks_prev: number;
    cpc: number;
    cpc_prev: number;
    impressions: number;
    impressions_prev: number;
    ctr: number;
    ctr_prev: number;
    roas: number;
    roas_prev: number;
    delivered: number;
    delivered_prev: number;
    open_rate: number;
    open_rate_prev: number;
    click_rate: number;
    click_rate_prev: number;
    unsubscribes: number;
    unsubscribes_prev: number;
    recipients: number;
    recipients_prev: number;
    conversion_value: number;
    conversion_value_prev: number;
    google_cost: number;
    google_cost_prev: number;
    meta_cost: number;
    meta_cost_prev: number;
    total_cost: number;
    total_cost_prev: number;
}

const makeRow = (period: string, idx: number): DummyRow => ({
    id: `row-${idx}`,
    period,
    orders: 895 + idx * 42,
    orders_prev: 113 + idx * 5,
    gross_sales: 15075.63 + idx * 1200,
    gross_sales_prev: 1973.96 + idx * 150,
    discount: 3442.06 + idx * 280,
    discount_prev: 473.96 + idx * 40,
    revenue: 8416.01 + idx * 650,
    revenue_prev: 949.2 + idx * 80,
    sessions: 4563 + idx * 320,
    sessions_prev: 921 + idx * 65,
    conv_rate: 3.7,
    conv_rate_prev: 2.5,
    aov: 49.8,
    aov_prev: 41.27,
    discount_pct: 31.83,
    discount_pct_prev: 36.49,
    spend: 4200 + idx * 350,
    spend_prev: 1350.08 + idx * 110,
    clicks: 1580 + idx * 120,
    clicks_prev: 450 + idx * 35,
    cpc: 2.66,
    cpc_prev: 3.0,
    impressions: 52400 + idx * 4200,
    impressions_prev: 15800 + idx * 1300,
    ctr: 3.02,
    ctr_prev: 2.85,
    roas: 5.12,
    roas_prev: 2.03,
    delivered: 12500 + idx * 980,
    delivered_prev: 8200 + idx * 640,
    open_rate: 42.3,
    open_rate_prev: 38.5,
    click_rate: 3.8,
    click_rate_prev: 3.1,
    unsubscribes: 45 + idx * 3,
    unsubscribes_prev: 62 + idx * 4,
    recipients: 13200 + idx * 1050,
    recipients_prev: 8800 + idx * 700,
    conversion_value: 6840 + idx * 540,
    conversion_value_prev: 2180 + idx * 175,
    google_cost: 0,
    google_cost_prev: 1749.32,
    meta_cost: 0,
    meta_cost_prev: 1350.08,
    total_cost: 0,
    total_cost_prev: 3099.4,
});

const makeSummary = (rows: DummyRow[]): DummyRow => {
    const sum = (key: keyof DummyRow) =>
        rows.reduce((acc, r) => acc + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
    const avg = (key: keyof DummyRow) => {
        const total = sum(key);
        return rows.length > 0 ? total / rows.length : 0;
    };
    return {
        id: "summary",
        period: "Summary",
        orders: sum("orders"),
        orders_prev: sum("orders_prev"),
        gross_sales: sum("gross_sales"),
        gross_sales_prev: sum("gross_sales_prev"),
        discount: sum("discount"),
        discount_prev: sum("discount_prev"),
        revenue: sum("revenue"),
        revenue_prev: sum("revenue_prev"),
        sessions: sum("sessions"),
        sessions_prev: sum("sessions_prev"),
        conv_rate: +avg("conv_rate").toFixed(2),
        conv_rate_prev: +avg("conv_rate_prev").toFixed(2),
        aov: +avg("aov").toFixed(2),
        aov_prev: +avg("aov_prev").toFixed(2),
        discount_pct: +avg("discount_pct").toFixed(2),
        discount_pct_prev: +avg("discount_pct_prev").toFixed(2),
        spend: sum("spend"),
        spend_prev: sum("spend_prev"),
        clicks: sum("clicks"),
        clicks_prev: sum("clicks_prev"),
        cpc: +avg("cpc").toFixed(2),
        cpc_prev: +avg("cpc_prev").toFixed(2),
        impressions: sum("impressions"),
        impressions_prev: sum("impressions_prev"),
        ctr: +avg("ctr").toFixed(2),
        ctr_prev: +avg("ctr_prev").toFixed(2),
        roas: +avg("roas").toFixed(2),
        roas_prev: +avg("roas_prev").toFixed(2),
        delivered: sum("delivered"),
        delivered_prev: sum("delivered_prev"),
        open_rate: +avg("open_rate").toFixed(2),
        open_rate_prev: +avg("open_rate_prev").toFixed(2),
        click_rate: +avg("click_rate").toFixed(2),
        click_rate_prev: +avg("click_rate_prev").toFixed(2),
        unsubscribes: sum("unsubscribes"),
        unsubscribes_prev: sum("unsubscribes_prev"),
        recipients: sum("recipients"),
        recipients_prev: sum("recipients_prev"),
        conversion_value: sum("conversion_value"),
        conversion_value_prev: sum("conversion_value_prev"),
        google_cost: sum("google_cost"),
        google_cost_prev: sum("google_cost_prev"),
        meta_cost: sum("meta_cost"),
        meta_cost_prev: sum("meta_cost_prev"),
        total_cost: sum("total_cost"),
        total_cost_prev: sum("total_cost_prev"),
    };
};

const ROWS = MONTHS.map((m, i) => makeRow(m, i));

export const SHOPIFY_DUMMY_ROWS = ROWS;
export const SHOPIFY_DUMMY_SUMMARY = makeSummary(ROWS);
export const META_DUMMY_ROWS = ROWS;
export const META_DUMMY_SUMMARY = makeSummary(ROWS);
export const ADWORD_DUMMY_ROWS = ROWS;
export const ADWORD_DUMMY_SUMMARY = makeSummary(ROWS);
export const BING_DUMMY_ROWS = ROWS;
export const BING_DUMMY_SUMMARY = makeSummary(ROWS);
export const CRITEO_DUMMY_ROWS = ROWS;
export const CRITEO_DUMMY_SUMMARY = makeSummary(ROWS);
export const EMAIL_DUMMY_ROWS = ROWS;
export const EMAIL_DUMMY_SUMMARY = makeSummary(ROWS);
export const FLOW_DUMMY_ROWS = ROWS;
export const FLOW_DUMMY_SUMMARY = makeSummary(ROWS);
export const CONSOLIDATED_DUMMY_ROWS = ROWS;
export const CONSOLIDATED_DUMMY_SUMMARY = makeSummary(ROWS);

export const CONNECTED_NETWORKS = ["shopify", "meta", "adword", "bing", "criteo", "email", "flow"];

export type { DummyRow };
