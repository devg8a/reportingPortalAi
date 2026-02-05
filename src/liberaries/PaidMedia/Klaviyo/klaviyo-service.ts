import {
    ApiKeySession,
    ProfilesApi,
    MetricsApi,
    CampaignsApi,
    FlowsApi,
    ListsApi,
    SegmentsApi,
    ReportingApi,
    RetryWithExponentialBackoff,
    CampaignValuesRequestDTO,
    FlowSeriesRequestDTO,
    MetricAggregateQuery,
} from 'klaviyo-api';
import logger from '../../../utils/logger';

// ─── Reporting Rate Limiter ─────────────────────────────────────
// Enforces Klaviyo reporting endpoint limits simultaneously:
//   Burst:  1 request / second
//   Steady: 2 requests / minute
//   Daily:  225 requests / day

interface ReportingRateLimiterState {
    burstTimestamps: number[];
    steadyTimestamps: number[];
    dailyCount: number;
    dailyResetAt: number;
}

class ReportingRateLimiter {
    private state: ReportingRateLimiterState;

    constructor() {
        const now = Date.now();
        this.state = {
            burstTimestamps: [],
            steadyTimestamps: [],
            dailyCount: 0,
            dailyResetAt: this.getNextMidnight(now),
        };
    }

    private getNextMidnight(now: number): number {
        const d = new Date(now);
        d.setUTCHours(24, 0, 0, 0);
        return d.getTime();
    }

    private cleanup(now: number): void {
        if (now >= this.state.dailyResetAt) {
            this.state.dailyCount = 0;
            this.state.dailyResetAt = this.getNextMidnight(now);
        }
        this.state.burstTimestamps = this.state.burstTimestamps.filter(
            (t) => now - t < 1000
        );
        this.state.steadyTimestamps = this.state.steadyTimestamps.filter(
            (t) => now - t < 60_000
        );
    }

    async acquire(): Promise<void> {
        while (true) {
            const now = Date.now();
            this.cleanup(now);

            if (this.state.dailyCount >= 225) {
                const waitMs = this.state.dailyResetAt - now;
                logger.warn(
                    `Klaviyo reporting daily limit reached (225/day). Waiting ${Math.ceil(waitMs / 1000)}s until reset.`
                );
                await this.sleep(waitMs + 1000);
                continue;
            }

            if (this.state.burstTimestamps.length >= 1) {
                const oldest = this.state.burstTimestamps[0];
                const waitMs = 1000 - (now - oldest);
                if (waitMs > 0) {
                    await this.sleep(waitMs + 50);
                    continue;
                }
            }

            if (this.state.steadyTimestamps.length >= 2) {
                const oldest = this.state.steadyTimestamps[0];
                const waitMs = 60_000 - (now - oldest);
                if (waitMs > 0) {
                    await this.sleep(waitMs + 50);
                    continue;
                }
            }

            const ts = Date.now();
            this.state.burstTimestamps.push(ts);
            this.state.steadyTimestamps.push(ts);
            this.state.dailyCount++;
            return;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// ─── Interfaces ─────────────────────────────────────────────────

interface NormalizedCampaign {
    id: string;
    name: string;
    type: string;
    send_time: string;
    status: string;
    archived: boolean;
    audiences: {
        included: Record<string, { name: string | null }>;
        excluded: Record<string, { name: string | null }>;
    };
    statistics: Record<string, unknown>;
}

interface NormalizedFlow {
    id: string;
    name: string;
    date: string;
    type: string;
    status: string;
    archived: boolean;
    statistics: Record<string, unknown>;
}

interface CampaignReportRequest {
    startDate: string;
    endDate: string;
    metricId?: string;
    timezone?: string;
}

interface DailyMetricRecord {
    date: string;
    count: number;
    unique: number;
    sum_value: number;
}

interface CampaignDailyRecord {
    date: string;
    campaign_id: string;
    campaign_name: string;
    count: number;
    unique: number;
    sum_value: number;
}

interface CampaignDailyMetricsRecord {
    date: string;
    campaign_id: string;
    campaign_name: string;
    total_recipients: number;
    unique_opens: number;
    unique_clicks: number;
    open_rate: number;
    click_rate: number;
    placed_order: number;
    placed_order_value: number;
    placed_order_rate: number;
    bounced: number;
    bounce_rate: number;
}

interface MetricAggregateResponseData {
    attributes?: {
        dates?: (string | Date)[];
        data?: Array<{
            dimensions?: string[];
            measurements?: Record<string, number[]>;
        }>;
    };
}

// ─── Statistics constants ───────────────────────────────────────

const ALL_CAMPAIGN_STATISTICS = [
    'average_order_value',
    'bounce_rate',
    'bounced',
    'bounced_or_failed',
    'bounced_or_failed_rate',
    'click_rate',
    'click_to_open_rate',
    'clicks',
    'clicks_unique',
    'conversion_rate',
    'conversion_uniques',
    'conversion_value',
    'conversions',
    'delivered',
    'delivery_rate',
    'failed',
    'failed_rate',
    'open_rate',
    'opens',
    'opens_unique',
    'recipients',
    'revenue_per_recipient',
    'spam_complaint_rate',
    'spam_complaints',
    'unsubscribe_rate',
    'unsubscribe_uniques',
    'unsubscribes',
] as const;

const ALL_FLOW_STATISTICS = [
    'average_order_value',
    'bounce_rate',
    'bounced',
    'bounced_or_failed',
    'bounced_or_failed_rate',
    'click_rate',
    'click_to_open_rate',
    'clicks',
    'clicks_unique',
    'conversion_rate',
    'conversion_uniques',
    'conversion_value',
    'conversions',
    'delivered',
    'delivery_rate',
    'failed',
    'failed_rate',
    'open_rate',
    'opens',
    'opens_unique',
    'recipients',
    'revenue_per_recipient',
    'spam_complaint_rate',
    'spam_complaints',
    'unsubscribe_rate',
    'unsubscribe_uniques',
    'unsubscribes',
] as const;

// ─── Main Service ───────────────────────────────────────────────

export class KlaviyoService {
    private session: ApiKeySession;
    private reportingLimiter: ReportingRateLimiter;

    constructor(privateKey: string) {
        const retry = new RetryWithExponentialBackoff({
            retryCodes: [429, 503, 504, 524],
            numRetries: 5,
            maxInterval: 120,
        });
        this.session = new ApiKeySession(privateKey, retry);
        this.reportingLimiter = new ReportingRateLimiter();
    }

    // ─── Date helpers ───────────────────────────────────────────

    private formatDate(d: Date): string {
        return d.toISOString().split('T')[0];
    }

    private getYesterday(): Date {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 1);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }

    private getFirstOfMonth(): Date {
        const d = new Date();
        d.setUTCDate(1);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }

    private get90DaysAgo(): Date {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 90);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    }

    // ─── Pagination helper ──────────────────────────────────────

    private async paginateAll<T>(
        fetchPage: (cursor?: string) => Promise<{ data: T[]; nextCursor?: string }>
    ): Promise<T[]> {
        const all: T[] = [];
        let cursor: string | undefined;
        do {
            const page = await fetchPage(cursor);
            all.push(...page.data);
            cursor = page.nextCursor;
        } while (cursor);
        return all;
    }

    private extractCursor(linkOrBody: unknown): string | undefined {
        if (!linkOrBody) return undefined;
        const obj = linkOrBody as Record<string, unknown>;
        const next =
            (obj as { links?: { next?: string } })?.links?.next ??
            (obj as { next?: string })?.next;
        if (typeof next !== 'string') return undefined;
        const match = next.match(/page%5Bcursor%5D=([^&]+)|page\[cursor\]=([^&]+)/);
        if (match) return decodeURIComponent(match[1] || match[2]);
        return undefined;
    }

    // ─── Campaign List (with pagination) ────────────────────────

    private async fetchCampaignList(): Promise<unknown[]> {
        const start = this.getFirstOfMonth();
        const end = this.getYesterday();
        const startStr = `${this.formatDate(start)}T00:00:00+00:00`;
        const endStr = `${this.formatDate(end)}T23:59:59+00:00`;

        const filter = `greater-or-equal(send_time,${startStr}),less-or-equal(send_time,${endStr}),equals(messages.channel,'email')`;

        return this.paginateAll(async (cursor) => {
            const api = new CampaignsApi(this.session);
            const resp = await api.getCampaigns(filter, {
                fieldsCampaign: [
                    'name',
                    'status',
                    'archived',
                    'audiences',
                    'audiences.included',
                    'audiences.excluded',
                    'send_time',
                ],
                pageCursor: cursor,
            });
            const body = resp.body as unknown as Record<string, unknown>;
            const data = (body?.data ?? []) as unknown[];
            const nextCursor = this.extractCursor(body);
            return { data, nextCursor };
        });
    }

    // ─── Campaign Values Report─────────────────────────────────

    private async fetchCampaignValuesReport(conversionMetricId: string): Promise<unknown[]> {
        const start = this.get90DaysAgo();
        const end = this.getYesterday();

        const results: unknown[] = [];
        let pageCursor: string | undefined;

        do {
            await this.reportingLimiter.acquire();
            const api = new ReportingApi(this.session);
            const requestBody: CampaignValuesRequestDTO = {
                data: {
                    type: 'campaign-values-report',
                    attributes: {
                        statistics: [...ALL_CAMPAIGN_STATISTICS],
                        timeframe: {
                            start: new Date(`${this.formatDate(start)}T00:00:00Z`),
                            end: new Date(`${this.formatDate(end)}T23:59:59Z`),
                        },
                        conversionMetricId,
                        filter: `equals(send_channel,"email")`,
                    },
                },
            };

            const resp = await api.queryCampaignValues(requestBody, {
                pageCursor,
            });
            const body = resp.body as unknown as Record<string, unknown>;
            const data = (body?.data ?? []) as unknown[];
            results.push(...data);
            pageCursor = this.extractCursor(body);
        } while (pageCursor);

        return results;
    }

    // ─── Audience Enrichment ────────────────────────────────────

    private collectAudienceIds(campaigns: unknown[]): Set<string> {
        const ids = new Set<string>();
        for (const c of campaigns) {
            const attrs = (c as { attributes?: Record<string, unknown> })?.attributes ?? {};
            const audiences = attrs.audiences as {
                included?: unknown[];
                excluded?: unknown[];
            } | undefined;
            if (audiences?.included) {
                for (const entry of audiences.included) {
                    const id = (entry as { id?: string })?.id;
                    if (id) ids.add(id);
                }
            }
            if (audiences?.excluded) {
                for (const entry of audiences.excluded) {
                    const id = (entry as { id?: string })?.id;
                    if (id) ids.add(id);
                }
            }
        }
        return ids;
    }

    private async batchLookupSegments(ids: string[]): Promise<Map<string, string>> {
        if (ids.length === 0) return new Map();
        const nameMap = new Map<string, string>();

        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const idsStr = batch.map((id) => `"${id}"`).join(',');
            const filter = `any(id,[${idsStr}])`;

            await this.paginateAll(async (cursor) => {
                const api = new SegmentsApi(this.session);
                const resp = await api.getSegments({
                    filter,
                    fieldsSegment: ['name'],
                    pageCursor: cursor,
                });
                const body = resp.body as unknown as Record<string, unknown>;
                const data = (body?.data ?? []) as Array<{
                    id: string;
                    attributes?: { name?: string };
                }>;
                for (const item of data) {
                    if (item.id && item.attributes?.name) {
                        nameMap.set(item.id, item.attributes.name);
                    }
                }
                return { data, nextCursor: this.extractCursor(body) };
            });
        }
        return nameMap;
    }

    private async batchLookupLists(ids: string[]): Promise<Map<string, string>> {
        if (ids.length === 0) return new Map();
        const nameMap = new Map<string, string>();

        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const idsStr = batch.map((id) => `"${id}"`).join(',');
            const filter = `any(id,[${idsStr}])`;

            await this.paginateAll(async (cursor) => {
                const api = new ListsApi(this.session);
                const resp = await api.getLists({
                    filter,
                    fieldsList: ['name'],
                    pageCursor: cursor,
                });
                const body = resp.body as unknown as Record<string, unknown>;
                const data = (body?.data ?? []) as Array<{
                    id: string;
                    attributes?: { name?: string };
                }>;
                for (const item of data) {
                    if (item.id && item.attributes?.name) {
                        nameMap.set(item.id, item.attributes.name);
                    }
                }
                return { data, nextCursor: this.extractCursor(body) };
            });
        }
        return nameMap;
    }

    private async enrichAudiences(
        audienceIds: Set<string>
    ): Promise<Map<string, string | null>> {
        const allIds = Array.from(audienceIds);
        const nameMap = new Map<string, string | null>();

        const [segmentNames, listNames] = await Promise.all([
            this.batchLookupSegments(allIds),
            this.batchLookupLists(allIds),
        ]);

        for (const id of allIds) {
            const name = segmentNames.get(id) ?? listNames.get(id) ?? null;
            nameMap.set(id, name);
        }
        return nameMap;
    }

    // ─── Flow List (with pagination) ────────────────────────────

    private async fetchFlowList(): Promise<unknown[]> {
        return this.paginateAll(async (cursor) => {
            const api = new FlowsApi(this.session);
            const resp = await api.getFlows({
                fieldsFlow: ['name', 'status', 'archived', 'trigger_type'],
                pageCursor: cursor,
            });
            const body = resp.body as unknown as Record<string, unknown>;
            const data = (body?.data ?? []) as unknown[];
            return { data, nextCursor: this.extractCursor(body) };
        });
    }

    // ─── Flow Series Report─────────────────────────────────────

    private async fetchFlowSeriesReport(conversionMetricId: string): Promise<unknown[]> {
        const start = this.getFirstOfMonth();
        const end = this.getYesterday();

        const results: unknown[] = [];
        let pageCursor: string | undefined;

        do {
            await this.reportingLimiter.acquire();
            const api = new ReportingApi(this.session);
            const requestBody: FlowSeriesRequestDTO = {
                data: {
                    type: 'flow-series-report',
                    attributes: {
                        statistics: [...ALL_FLOW_STATISTICS],
                        timeframe: {
                            start: new Date(`${this.formatDate(start)}T00:00:00Z`),
                            end: new Date(`${this.formatDate(end)}T23:59:59Z`),
                        },
                        interval: 'daily',
                        conversionMetricId,
                        filter: `equals(send_channel,"email")`,
                    },
                },
            };

            const resp = await api.queryFlowSeries(requestBody, {
                pageCursor,
            });
            const body = resp.body as unknown as Record<string, unknown>;
            const data = (body?.data ?? []) as unknown[];
            results.push(...data);
            pageCursor = this.extractCursor(body);
        } while (pageCursor);

        return results;
    }

    // ─── Normalization: Campaigns ───────────────────────────────

    private normalizeCampaigns(
        rawCampaigns: unknown[],
        valuesReport: unknown[],
        audienceNameMap: Map<string, string | null>
    ): NormalizedCampaign[] {
        const statsById = new Map<string, Record<string, unknown>>();
        for (const entry of valuesReport) {
            const e = entry as {
                relationships?: {
                    campaign?: { data?: { id?: string } };
                };
                attributes?: { statistics?: Record<string, unknown> };
            };
            const campaignId = e.relationships?.campaign?.data?.id;
            const stats = e.attributes?.statistics;
            if (campaignId && stats) {
                statsById.set(campaignId, stats);
            }
        }

        return rawCampaigns.map((c) => {
            const campaign = c as {
                id: string;
                attributes?: {
                    name?: string;
                    status?: string;
                    archived?: boolean;
                    send_time?: string;
                    audiences?: {
                        included?: Array<{ id?: string }>;
                        excluded?: Array<{ id?: string }>;
                    };
                };
            };

            const attrs = campaign.attributes ?? {};
            const rawSendTime = attrs.send_time ?? '';
            const sendDate = rawSendTime ? rawSendTime.split('T')[0] : '';

            const buildAudienceMap = (
                entries?: Array<{ id?: string }>
            ): Record<string, { name: string | null }> => {
                const result: Record<string, { name: string | null }> = {};
                if (!entries) return result;
                for (const entry of entries) {
                    const id = entry.id;
                    if (id) {
                        result[id] = { name: audienceNameMap.get(id) ?? null };
                    }
                }
                return result;
            };

            return {
                id: campaign.id,
                name: attrs.name ?? '',
                type: 'campaign',
                send_time: sendDate,
                status: attrs.status ?? '',
                archived: attrs.archived ?? false,
                audiences: {
                    included: buildAudienceMap(attrs.audiences?.included),
                    excluded: buildAudienceMap(attrs.audiences?.excluded),
                },
                statistics: statsById.get(campaign.id) ?? {},
            };
        });
    }

    // ─── Normalization: Flows ───────────────────────────────────

    private normalizeFlows(
        rawFlows: unknown[],
        seriesReport: unknown[]
    ): NormalizedFlow[] {
        const flowMeta = new Map<
            string,
            { name: string; status: string; archived: boolean; triggerType: string }
        >();
        for (const f of rawFlows) {
            const flow = f as {
                id: string;
                attributes?: {
                    name?: string;
                    status?: string;
                    archived?: boolean;
                    trigger_type?: string;
                };
            };
            flowMeta.set(flow.id, {
                name: flow.attributes?.name ?? '',
                status: flow.attributes?.status ?? '',
                archived: flow.attributes?.archived ?? false,
                triggerType: flow.attributes?.trigger_type ?? '',
            });
        }

        const results: NormalizedFlow[] = [];

        for (const entry of seriesReport) {
            const e = entry as {
                attributes?: {
                    results?: Array<{
                        dimensions?: { flow_id?: string; send_channel?: string };
                        data?: Record<string, number[]>;
                    }>;
                    dateTimes?: string[];
                };
            };

            const dateTimes = e.attributes?.dateTimes ?? [];
            const seriesResults = e.attributes?.results ?? [];

            for (const row of seriesResults) {
                const flowId = row.dimensions?.flow_id;
                if (!flowId) continue;

                const meta = flowMeta.get(flowId);
                if (!meta) continue;

                const measurements = row.data ?? {};

                for (let i = 0; i < dateTimes.length; i++) {
                    const dt = dateTimes[i];
                    const dateStr = typeof dt === 'string' ? dt.split('T')[0] : String(dt).split('T')[0];

                    const dayStats: Record<string, number> = {};
                    for (const [key, values] of Object.entries(measurements)) {
                        if (Array.isArray(values) && i < values.length) {
                            dayStats[key] = values[i];
                        }
                    }

                    results.push({
                        id: flowId,
                        name: meta.name,
                        date: dateStr,
                        type: 'flow',
                        status: meta.status,
                        archived: meta.archived,
                        statistics: dayStats,
                    });
                }
            }
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API — New methods (campaigns + flows + audience)
    // ═══════════════════════════════════════════════════════════

    async getCampaignsWithMetrics(conversionMetricId: string): Promise<NormalizedCampaign[]> {
        try {
            logger.info('Klaviyo: Fetching campaign list...');
            const rawCampaigns = await this.fetchCampaignList();
            logger.info(`Klaviyo: Fetched ${rawCampaigns.length} campaigns`);

            logger.info('Klaviyo: Fetching campaign values report...');
            const valuesReport = await this.fetchCampaignValuesReport(conversionMetricId);
            logger.info(`Klaviyo: Fetched ${valuesReport.length} campaign value entries`);

            logger.info('Klaviyo: Enriching audience names...');
            const audienceIds = this.collectAudienceIds(rawCampaigns);
            logger.info(`Klaviyo: Found ${audienceIds.size} unique audience IDs to resolve`);
            const audienceNameMap = await this.enrichAudiences(audienceIds);

            const campaigns = this.normalizeCampaigns(rawCampaigns, valuesReport, audienceNameMap);
            logger.info(`Klaviyo: Normalized ${campaigns.length} campaigns with metrics`);
            return campaigns;
        } catch (error) {
            logger.error(error, 'Error in KlaviyoService.getCampaignsWithMetrics');
            throw new Error('Error fetching Klaviyo campaigns with metrics');
        }
    }

    async getFlowsWithMetrics(conversionMetricId: string): Promise<NormalizedFlow[]> {
        try {
            logger.info('Klaviyo: Fetching flow list...');
            const rawFlows = await this.fetchFlowList();
            logger.info(`Klaviyo: Fetched ${rawFlows.length} flows`);

            logger.info('Klaviyo: Fetching flow series report...');
            const seriesReport = await this.fetchFlowSeriesReport(conversionMetricId);
            logger.info(`Klaviyo: Fetched ${seriesReport.length} flow series entries`);

            const flows = this.normalizeFlows(rawFlows, seriesReport);
            logger.info(`Klaviyo: Normalized ${flows.length} flow-date records`);
            return flows;
        } catch (error) {
            logger.error(error, 'Error in KlaviyoService.getFlowsWithMetrics');
            throw new Error('Error fetching Klaviyo flows with metrics');
        }
    }

    async fetchAll(conversionMetricId: string): Promise<{
        campaigns: NormalizedCampaign[];
        flows: NormalizedFlow[];
    }> {
        const [campaigns, flows] = await Promise.all([
            this.getCampaignsWithMetrics(conversionMetricId),
            this.getFlowsWithMetrics(conversionMetricId),
        ]);
        return { campaigns, flows };
    }

    // ═══════════════════════════════════════════════════════════
    // LEGACY METHODS — kept for backward compatibility
    // ═══════════════════════════════════════════════════════════

    async getProfiles() {
        try {
            const profilesApi = new ProfilesApi(this.session);
            const profileList = await profilesApi.getProfiles();
            return profileList?.body?.data;
        } catch (error) {
            logger.info(error);
            throw new Error('Error in klaviyo getProfiles API');
        }
    }

    async getMetrices() {
        try {
            const metrices = new MetricsApi(this.session);
            const metricesList = await metrices.getMetrics();
            return metricesList?.body?.data;
        } catch (error) {
            logger.info(error);
            throw new Error('Error in klaviyo getMetrices API');
        }
    }

    async getCampaigns() {
        try {
            const start = this.getFirstOfMonth();
            const end = this.getYesterday();
            const startStr = `${this.formatDate(start)}T00:00:00`;
            const endStr = `${this.formatDate(end)}T23:59:59`;
            const filter = `greater-or-equal(send_time,${startStr}),less-or-equal(send_time,${endStr}),equals(messages.channel,'email')`;
            const campaigns = new CampaignsApi(this.session);
            const campaignsList = await campaigns.getCampaigns(filter);
            return campaignsList?.body?.data;
        } catch (error) {
            logger.info(error);
            throw new Error('Error in klaviyo getCampaigns API');
        }
    }

    async getFlows() {
        try {
            const flows = new FlowsApi(this.session);
            const flowsList = await flows.getFlows();
            return flowsList?.body?.data;
        } catch (error) {
            logger.info(error);
            throw new Error('Error in klaviyo getFlows API');
        }
    }

    async getCampaignReport(requestData: CampaignReportRequest) {
        try {
            const { startDate, endDate, metricId, timezone = 'UTC' } = requestData;

            const metricsApi = new MetricsApi(this.session);

            let targetMetricId = metricId;
            if (!targetMetricId) {
                const metricsList = await metricsApi.getMetrics();
                const receivedEmailMetric = metricsList?.body?.data?.find(
                    (m: { attributes?: { name?: string } }) => m.attributes?.name === 'Received Email'
                );
                if (receivedEmailMetric) {
                    targetMetricId = receivedEmailMetric.id;
                } else {
                    throw new Error('Could not find Received Email metric. Please provide a metricId.');
                }
            }

            const startDateTime = `${startDate}T00:00:00`;
            const endDateTime = `${endDate}T23:59:59`;

            const metricAggregateQuery: MetricAggregateQuery = {
                data: {
                    type: 'metric-aggregate',
                    attributes: {
                        metricId: targetMetricId,
                        measurements: ['count', 'unique', 'sum_value'],
                        interval: 'day',
                        pageSize: 500,
                        by: ['$attributed_message', 'Campaign Name'],
                        filter: [
                            `greater-or-equal(datetime,${startDateTime})`,
                            `less-than(datetime,${endDateTime})`,
                        ],
                        timezone: timezone,
                    },
                },
            };

            const response = await metricsApi.queryMetricAggregates(metricAggregateQuery);
            const rawData = response?.body?.data;

            const dailyRecords = this.transformToDailyAggregates(rawData as MetricAggregateResponseData);

            return dailyRecords;
        } catch (error) {
            logger.error(error, 'Error in klaviyo getCampaignReport API');
            throw new Error('Error in klaviyo getCampaignReport API');
        }
    }

    async getCampaignDailyReport(requestData: CampaignReportRequest): Promise<CampaignDailyMetricsRecord[]> {
        try {
            const { startDate, endDate, timezone = 'UTC' } = requestData;

            const metricsApi = new MetricsApi(this.session);
            const metricsList = await metricsApi.getMetrics();
            const metricsData = metricsList?.body?.data || [];

            const targetMetricNames = [
                'Received Email',
                'Opened Email',
                'Clicked Email',
                'Bounced Email',
                'Placed Order',
            ];

            const metricMap: Record<string, string> = {};
            for (const m of metricsData) {
                const name = m.attributes?.name;
                if (name && targetMetricNames.includes(name)) {
                    metricMap[name] = m.id;
                }
            }

            const startDateTime = `${startDate}T00:00:00`;
            const endDateTime = `${endDate}T23:59:59`;

            const campaignData: Record<
                string,
                Record<
                    string,
                    {
                        campaign_id: string;
                        campaign_name: string;
                        received: number;
                        opened: number;
                        clicked: number;
                        bounced: number;
                        placed_order: number;
                        placed_order_value: number;
                    }
                >
            > = {};

            for (const metricName of targetMetricNames) {
                const metricId = metricMap[metricName];
                if (!metricId) continue;

                const metricAggregateQuery: MetricAggregateQuery = {
                    data: {
                        type: 'metric-aggregate',
                        attributes: {
                            metricId: metricId,
                            measurements: ['count', 'unique', 'sum_value'],
                            interval: 'day',
                            pageSize: 500,
                            by: ['$attributed_message', 'Campaign Name'],
                            filter: [
                                `greater-or-equal(datetime,${startDateTime})`,
                                `less-than(datetime,${endDateTime})`,
                            ],
                            timezone: timezone,
                        },
                    },
                };

                const response = await metricsApi.queryMetricAggregates(metricAggregateQuery);
                const rawData = response?.body?.data as MetricAggregateResponseData;
                const dates = rawData?.attributes?.dates || [];
                const data = rawData?.attributes?.data || [];

                for (const row of data) {
                    const dimensions = row.dimensions || [];
                    const campaignId = dimensions[0] || 'unknown';
                    const campaignName = dimensions[1] || 'Unknown Campaign';
                    const measurements = row.measurements || {};
                    const countArr = measurements.count || [];
                    const uniqueArr = measurements.unique || [];
                    const sumValueArr = measurements.sum_value || [];

                    for (let i = 0; i < dates.length; i++) {
                        const dateVal = dates[i];
                        const dateStr =
                            typeof dateVal === 'string'
                                ? dateVal.split('T')[0]
                                : dateVal instanceof Date
                                    ? dateVal.toISOString().split('T')[0]
                                    : String(dateVal).split('T')[0];

                        const key = `${dateStr}|${campaignId}`;
                        if (!campaignData[key]) {
                            campaignData[key] = {};
                        }
                        if (!campaignData[key][campaignId]) {
                            campaignData[key][campaignId] = {
                                campaign_id: campaignId,
                                campaign_name: campaignName,
                                received: 0,
                                opened: 0,
                                clicked: 0,
                                bounced: 0,
                                placed_order: 0,
                                placed_order_value: 0,
                            };
                        }

                        const uniqueCount = uniqueArr[i] || 0;
                        const sumValue = sumValueArr[i] || 0;

                        if (metricName === 'Received Email') {
                            campaignData[key][campaignId].received += countArr[i] || 0;
                        } else if (metricName === 'Opened Email') {
                            campaignData[key][campaignId].opened += uniqueCount;
                        } else if (metricName === 'Clicked Email') {
                            campaignData[key][campaignId].clicked += uniqueCount;
                        } else if (metricName === 'Bounced Email') {
                            campaignData[key][campaignId].bounced += countArr[i] || 0;
                        } else if (metricName === 'Placed Order') {
                            campaignData[key][campaignId].placed_order += countArr[i] || 0;
                            campaignData[key][campaignId].placed_order_value += sumValue;
                        }
                    }
                }
            }

            const records: CampaignDailyMetricsRecord[] = [];
            for (const key of Object.keys(campaignData)) {
                const [dateStr] = key.split('|');
                for (const campaignId of Object.keys(campaignData[key])) {
                    const data = campaignData[key][campaignId];
                    const totalRecipients = data.received;
                    const openRate = totalRecipients > 0 ? (data.opened / totalRecipients) * 100 : 0;
                    const clickRate = totalRecipients > 0 ? (data.clicked / totalRecipients) * 100 : 0;
                    const bounceRate = totalRecipients > 0 ? (data.bounced / totalRecipients) * 100 : 0;
                    const placedOrderRate =
                        totalRecipients > 0 ? (data.placed_order / totalRecipients) * 100 : 0;

                    if (totalRecipients > 0 || data.placed_order > 0) {
                        records.push({
                            date: dateStr,
                            campaign_id: data.campaign_id,
                            campaign_name: data.campaign_name,
                            total_recipients: totalRecipients,
                            unique_opens: data.opened,
                            unique_clicks: data.clicked,
                            open_rate: Math.round(openRate * 100) / 100,
                            click_rate: Math.round(clickRate * 100) / 100,
                            placed_order: data.placed_order,
                            placed_order_value: Math.round(data.placed_order_value * 100) / 100,
                            placed_order_rate: Math.round(placedOrderRate * 100) / 100,
                            bounced: data.bounced,
                            bounce_rate: Math.round(bounceRate * 100) / 100,
                        });
                    }
                }
            }

            return records.sort((a, b) => {
                const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
                if (dateCompare !== 0) return dateCompare;
                return a.campaign_name.localeCompare(b.campaign_name);
            });
        } catch (error) {
            logger.error(error, 'Error in klaviyo getCampaignDailyReport API');
            throw new Error('Error in klaviyo getCampaignDailyReport API');
        }
    }

    async getCampaignReportMultiMetric(requestData: CampaignReportRequest) {
        try {
            const { startDate, endDate, timezone = 'UTC' } = requestData;

            const metricsApi = new MetricsApi(this.session);

            const metricsList = await metricsApi.getMetrics();
            const metricsData = metricsList?.body?.data || [];

            const targetMetricNames = [
                'Received Email',
                'Opened Email',
                'Clicked Email',
                'Bounced Email',
                'Unsubscribed',
            ];

            const targetMetrics = metricsData.filter(
                (m: { attributes?: { name?: string } }) =>
                    targetMetricNames.includes(m.attributes?.name || '')
            );

            const startDateTime = `${startDate}T00:00:00`;
            const endDateTime = `${endDate}T23:59:59`;

            const results: Record<
                string,
                { date: string; metrics: Record<string, { count: number; unique: number; sum_value: number }> }
            > = {};

            for (const metric of targetMetrics) {
                const metricName = metric.attributes?.name || 'unknown';
                const metricKey = metricName.toLowerCase().replace(/\s+/g, '_');

                const metricAggregateQuery: MetricAggregateQuery = {
                    data: {
                        type: 'metric-aggregate',
                        attributes: {
                            metricId: metric.id,
                            measurements: ['count', 'unique', 'sum_value'],
                            interval: 'day',
                            pageSize: 500,
                            by: ['$attributed_message'],
                            filter: [
                                `greater-or-equal(datetime,${startDateTime})`,
                                `less-than(datetime,${endDateTime})`,
                            ],
                            timezone: timezone,
                        },
                    },
                };

                const response = await metricsApi.queryMetricAggregates(metricAggregateQuery);
                const rawData = response?.body?.data;

                const responseData = rawData as MetricAggregateResponseData;
                const dates = responseData?.attributes?.dates || [];
                const data = responseData?.attributes?.data || [];

                for (let i = 0; i < dates.length; i++) {
                    const dateVal = dates[i];
                    const dateStr =
                        typeof dateVal === 'string'
                            ? dateVal.split('T')[0]
                            : dateVal instanceof Date
                                ? dateVal.toISOString().split('T')[0]
                                : String(dateVal).split('T')[0];

                    if (!results[dateStr]) {
                        results[dateStr] = {
                            date: dateStr,
                            metrics: {},
                        };
                    }

                    if (!results[dateStr].metrics[metricKey]) {
                        results[dateStr].metrics[metricKey] = { count: 0, unique: 0, sum_value: 0 };
                    }
                }

                for (const row of data) {
                    const measurements = row.measurements || {};
                    const countArr = measurements.count || [];
                    const uniqueArr = measurements.unique || [];
                    const sumValueArr = measurements.sum_value || [];

                    for (let i = 0; i < dates.length; i++) {
                        const dateVal = dates[i];
                        const dateStr =
                            typeof dateVal === 'string'
                                ? dateVal.split('T')[0]
                                : dateVal instanceof Date
                                    ? dateVal.toISOString().split('T')[0]
                                    : String(dateVal).split('T')[0];

                        if (results[dateStr] && results[dateStr].metrics[metricKey]) {
                            results[dateStr].metrics[metricKey].count += countArr[i] || 0;
                            results[dateStr].metrics[metricKey].unique += uniqueArr[i] || 0;
                            results[dateStr].metrics[metricKey].sum_value += sumValueArr[i] || 0;
                        }
                    }
                }
            }

            const dailyRecords = Object.values(results).sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            return dailyRecords;
        } catch (error) {
            logger.error(error, 'Error in klaviyo getCampaignReportMultiMetric API');
            throw new Error('Error in klaviyo getCampaignReportMultiMetric API');
        }
    }

    private transformToCampaignDailyRecords(rawData: MetricAggregateResponseData): CampaignDailyRecord[] {
        const dates = rawData?.attributes?.dates || [];
        const data = rawData?.attributes?.data || [];

        if (dates.length === 0 || data.length === 0) {
            return [];
        }

        const records: CampaignDailyRecord[] = [];

        for (const row of data) {
            const dimensions = row.dimensions || [];
            const campaignId = dimensions[0] || 'unknown';
            const campaignName = dimensions[1] || 'Unknown Campaign';
            const measurements = row.measurements || {};
            const countArr = measurements.count || [];
            const uniqueArr = measurements.unique || [];
            const sumValueArr = measurements.sum_value || [];

            for (let i = 0; i < dates.length; i++) {
                const dateVal = dates[i];
                const dateStr =
                    typeof dateVal === 'string'
                        ? dateVal.split('T')[0]
                        : dateVal instanceof Date
                            ? dateVal.toISOString().split('T')[0]
                            : String(dateVal).split('T')[0];

                const count = countArr[i] || 0;
                const unique = uniqueArr[i] || 0;
                const sumValue = sumValueArr[i] || 0;

                if (count > 0 || unique > 0 || sumValue > 0) {
                    records.push({
                        date: dateStr,
                        campaign_id: campaignId,
                        campaign_name: campaignName,
                        count: count,
                        unique: unique,
                        sum_value: sumValue,
                    });
                }
            }
        }

        return records.sort((a, b) => {
            const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.campaign_name.localeCompare(b.campaign_name);
        });
    }

    private transformToDailyAggregates(rawData: MetricAggregateResponseData): DailyMetricRecord[] {
        const dates = rawData?.attributes?.dates || [];
        const data = rawData?.attributes?.data || [];

        if (dates.length === 0) {
            return [];
        }

        const dailyMap: Record<string, DailyMetricRecord> = {};

        for (let i = 0; i < dates.length; i++) {
            const dateVal = dates[i];
            const dateStr =
                typeof dateVal === 'string'
                    ? dateVal.split('T')[0]
                    : dateVal instanceof Date
                        ? dateVal.toISOString().split('T')[0]
                        : String(dateVal).split('T')[0];

            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = {
                    date: dateStr,
                    count: 0,
                    unique: 0,
                    sum_value: 0,
                };
            }
        }

        for (const row of data) {
            const measurements = row.measurements || {};
            const countArr = measurements.count || [];
            const uniqueArr = measurements.unique || [];
            const sumValueArr = measurements.sum_value || [];

            for (let i = 0; i < dates.length; i++) {
                const dateVal = dates[i];
                const dateStr =
                    typeof dateVal === 'string'
                        ? dateVal.split('T')[0]
                        : dateVal instanceof Date
                            ? dateVal.toISOString().split('T')[0]
                            : String(dateVal).split('T')[0];

                if (dailyMap[dateStr]) {
                    dailyMap[dateStr].count += countArr[i] || 0;
                    dailyMap[dateStr].unique += uniqueArr[i] || 0;
                    dailyMap[dateStr].sum_value += sumValueArr[i] || 0;
                }
            }
        }

        return Object.values(dailyMap).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }
}

export { KlaviyoService as klaviyoService };

