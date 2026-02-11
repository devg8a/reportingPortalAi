export interface DivergenceReportRequest {
    clientId: string;
    groupClientIds?: string[];
    startDate: string;
    endDate: string;
    compareStartDate?: string;
    compareEndDate?: string;
    aggregation?: "day" | "week" | "month";
}

export interface NetworkMetricRow {
    period: string;
    orders: number;
    orders_change?: number;
    gross_sales: number;
    gross_sales_change?: number;
    discount: number;
    discount_change?: number;
    revenue: number;
    revenue_change?: number;
    sessions: number;
    sessions_change?: number;
    conv_rate: number;
    conv_rate_change?: number;
    aov: number;
    aov_change?: number;
    discount_pct?: number;
    discount_pct_change?: number;
    google_cost?: number;
    google_cost_change?: number;
    meta_cost?: number;
    meta_cost_change?: number;
    total_cost?: number;
    total_cost_change?: number;
    meta_pct?: number;
    meta_pct_change?: number;
    cost_per_session?: number;
    cost_per_session_change?: number;
    roas?: number;
    roas_change?: number;
    spend?: number;
    spend_change?: number;
    clicks?: number;
    clicks_change?: number;
    cpc?: number;
    cpc_change?: number;
    ctr?: number;
    ctr_change?: number;
    impressions?: number;
    impressions_change?: number;
    outbound_clicks?: number;
    outbound_clicks_change?: number;
    delivered?: number;
    delivered_change?: number;
    open_rate?: number;
    open_rate_change?: number;
    click_rate?: number;
    click_rate_change?: number;
    unsubscribes?: number;
    unsubscribes_change?: number;
    conversion_value?: number;
    conversion_value_change?: number;
    recipients?: number;
    recipients_change?: number;
}

export interface NetworkTableData {
    network: string;
    rows: NetworkMetricRow[];
    summary: NetworkMetricRow;
}

export interface ChartSeriesData {
    labels: string[];
    series: Record<string, number[]>;
}

export interface DivergenceReportResponse {
    success: boolean;
    data: {
        client_id: string;
        client_name: string;
        last_updated?: string;
        charts: ChartSeriesData;
        comparison_charts?: ChartSeriesData;
        networks: NetworkTableData[];
        consolidated?: NetworkTableData;
        connected_networks: string[];
    };
}

export interface GroupClient {
    _id: string;
    name: string;
    main_account_id?: string;
}
