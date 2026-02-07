export interface EmailMarketingSummaryRequest {
    clientId: string;
    startDate: string;
    endDate: string;
    compareStartDate?: string;
    compareEndDate?: string;
}

export interface RevenueStat {
    current: number;
    previous: number;
}

export interface EmailMarketingSummaryResponse {
    success: boolean;
    data: {
        lastUpdated: string;
        totalRevenue: RevenueStat;
        emailRevenue: RevenueStat;
        flowRevenue: RevenueStat;
        campaignsRevenue: RevenueStat;
        smsMmsRevenue: RevenueStat;
    };
}

export interface BenchmarkPeriod {
    total_delivered: number;
    total_opens_unique: number;
    total_clicks_unique: number;
    avg_delivered: number;
    avg_unique_open_email: number;
    avg_unique_clicks: number;
    open_rate: number;
    click_rate: number;
}

export interface EmailMarketingBenchmarksResponse {
    success: boolean;
    data: {
        twoMonths: BenchmarkPeriod;
        sixMonths: BenchmarkPeriod;
        twelveMonths: BenchmarkPeriod;
    };
}

export interface CampaignRecord {
    [key: string]: string | number | undefined;
    campaign_name: string;
    send_weekday: string;
    total_recipients: number;
    unique_placed_order: number;
    place_order_rate: number;
    unique_opens: number;
    open_rate: number;
    click_rate: number;
    unique_clicks: number;
    delivered: number;
    bounced: number;
    unsubscribes: number;
    conversion_value: number;
    preview_url?: string;
    status?: string;
}

export interface CampaignMetrics {
    open_rate: number;
    total_recipients: number;
    click_rate: number;
    num_emails: number;
    num_unsubscribers: number;
    promo_recipients: number;
    non_promo_recipients: number;
}

export interface EmailMarketingCampaignsResponse {
    success: boolean;
    data: {
        metrics: CampaignMetrics;
        previousMetrics?: CampaignMetrics;
        campaigns: CampaignRecord[];
    };
}

export interface FlowRecord {
    [key: string]: string | number | undefined;
    flow_name: string;
    delivered: number;
    open_rate: number;
    click_rate: number;
    conversion_value: number;
    recipients: number;
    bounced: number;
    unsubscribes: number;
    unique_opens: number;
    unique_clicks: number;
}

export interface EmailMarketingFlowsResponse {
    success: boolean;
    data: {
        flows: FlowRecord[];
        summary: {
            total_delivered: number;
            total_conversion_value: number;
            avg_open_rate: number;
            avg_click_rate: number;
            total_recipients: number;
            total_unsubscribes: number;
        };
    };
}
