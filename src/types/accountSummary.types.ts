// Account Summary API Types

export interface TimeseriesData {
    date: string;
    hour?: string;
    impressions?: number;
    clicks?: number;
    spend?: number;
    revenue?: number;
    sessions?: number;
    conversions?: number;
    [key: string]: any;
}

export interface NetworkData {
    network: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    roas: number;
    ctr: number;
    cpc: number;

    // 🔴 NEW: Attribution fields
    revenue_7d_click?: number;
    revenue_1d_view?: number;
    roas_ct?: number;
    roas_vt?: number;
    outbound_clicks?: number; // 🔴 NEW

    timeseries: TimeseriesData[];

    previous_revenue?: number;
    previous_spend?: number;
    previous_roas?: number;
    previous_cpc?: number;
    previous_clicks?: number;
    previous_sessions?: number;
    previous_outbound_clicks?: number; // 🔴 NEW

    // 🔴 NEW: Previous Attribution fields
    previous_revenue_7d_click?: number;
    previous_revenue_1d_view?: number;
    previous_roas_ct?: number;
    previous_roas_vt?: number;

    icon?: string;
}

export interface ClientSummary {
    _id: any;
    name: any;
    client_id?: string;
    client_name?: string;
    overall_stats: {
        revenue: number;
        spend: number;
        roas: number;
        sessions: number;
        previous_revenue?: number;
        previous_spend?: number;
    };
    status: any;
    clientId: string;
    clientName: string;
    totalSpend: number;
    totalRevenue: number;
    totalRoas: number;
    networks: NetworkData[];
    lastUpdated: string;
}

export interface AccountSummaryResponse {
    success: boolean;
    data: ClientSummary[];
    last_updated?: string;  // ADD THIS
    message?: string;
    timestamp?: string;
}

export interface AccountSummaryRequestParams {
    userId?: string;
    startDate: string;
    endDate: string;
    comparison?: 'yesterday_same_hour' | 'previous_period';
    compareStartDate?: string;
    compareEndDate?: string;
    aggregation?: 'hourly' | 'daily' | 'weekly' | 'monthly';
    clientIds?: string[];
    clientId?: string; // Optional single client ID
}

// Hidden Clients Types
export interface HiddenClient {
    clientId: string;
    clientName?: string;
    hiddenAt: string;
    hiddenBy?: string;
}

export interface HideClientRequest {
    clientIds: string[];
}

export interface HideClientResponse {
    success: boolean;
    message: string;
    hiddenClients: HiddenClient[];
}

export interface UnhideClientRequest {
    clientIds: string[];
}

export interface UnhideClientResponse {
    success: boolean;
    message: string;
    unhiddenClientIds: string[];
}

export interface GetHiddenClientsResponse {
    success: boolean;
    data: HiddenClient[];
}

// Hourly Cron Types
export interface HourlyCronStatus {
    lastRun: string;
    nextRun: string;
    status: 'running' | 'idle' | 'error';
    message?: string;
}

export interface TriggerCronRequest {
    force?: boolean;
}

export interface TriggerCronResponse {
    success: boolean;
    message: string;
    jobId?: string;
    startedAt: string;
}

export interface GetCronStatusResponse {
    success: boolean;
    data: HourlyCronStatus;
}

// Performance Report Types
export interface PerformanceReportRequest {
    client_id: string;
    start_date: string;
    end_date: string;
    compare_start_date?: string;
    compare_end_date?: string;
    group?: string;
    entity_ids?: string[];
    aggregation?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

interface BaseStats {
    revenue?: number; // For Meta/Adword
    channel_revenue?: number; // For All
    shopify_revenue?: number;
    spend: number;
    clicks?: number;
    cpc?: number;
    roas?: number;
    roas_channel?: number;
    roas_shopify?: number;

    // 🔴 NEW: Attribution fields
    revenue_7d_click?: number;
    revenue_1d_view?: number;
    roas_ct?: number;
    roas_vt?: number;
    outbound_clicks?: number; // 🔴 NEW
}

interface ChartStats {
    current: BaseStats;
    base: BaseStats;
    comparison?: BaseStats;
}

export interface PerformanceReportResponse {
    success: boolean;
    status_code: number;
    message: string;
    data: {
        client_id: string;
        client_name: string;
        date_range: {
            start_date: string;
            end_date: string;
        };
        charts: {
            all: {
                labels: string[];
                series: {
                    channel_revenue: number[];
                    shopify_revenue: number[];
                    spend: number[];
                    sessions?: number[];
                    roas?: number[];
                    cpc?: number[];
                };
                stats: ChartStats; // NEW
            };
            meta: {
                labels: string[];
                series: {
                    revenue: number[];
                    spend: number[];
                    clicks?: number[];
                    roas?: number[];
                    cpc?: number[];
                    outbound_clicks?: number[]; // 🔴 NEW
                };
                stats: ChartStats; // NEW
            };
            adword: {
                labels: string[];
                series: {
                    revenue: number[];
                    spend: number[];
                    clicks?: number[];
                    roas?: number[];
                    cpc?: number[];
                    outbound_clicks?: number[]; // 🔴 NEW
                };
                stats: ChartStats; // NEW
            };
        };
        overall_stats: {
            channel_revenue: number;
            shopify_revenue: number;
            spend: number;
            roas_channel: number;
            roas_shopify: number;
            percent_of_spend: number | null;
            percent_of_sale: number | null;
            clicks?: number; // Added in backend
            cpc_channel?: number; // Added in backend
        };
    };
}

// Performance Entities Types
export interface PerformanceEntity {
    entity_id: string;
    entity_name: string;
    meta?: any;
    adword?: any;
}

export interface PerformanceEntityGroup {
    group_name: string;
    data: PerformanceEntity[];
}

export interface GetPerformanceEntitiesRequest {
    client_id?: string;
    status?: string;
    type?: string;
}

export interface GetPerformanceEntitiesResponse {
    success: boolean;
    data: PerformanceEntityGroup[];
}
