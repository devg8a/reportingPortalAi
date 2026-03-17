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
} from 'klaviyo-api';
import logger from '../../../utils/logger';
import { getCentralStorageModel } from "../../../db/schema/dynamic-central-model";
import { getMongoDbObjectId } from "../../../helper/helper";
import ErrorLogs from '../../../db/models/errorLogs';

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
    channel: string;
    send_time: string;
    status: string;
    archived: boolean;
    message_id: string;
    audiences: {
        included: Record<string, AudienceInfo>;
        excluded: Record<string, AudienceInfo>;
    };
    statistics: Record<string, unknown>;
}

interface NormalizedFlow {
    id: string;
    name: string;
    type: string;
    status: string;
    archived: boolean;
    date: string;
    statistics: Record<string, number>;
}

// interface CampaignReportRequest {
//     startDate: string;
//     endDate: string;
//     metricId?: string;
//     timezone?: string;
// }

// interface DailyMetricRecord {
//     date: string;
//     count: number;
//     unique: number;
//     sum_value: number;
// }

// interface CampaignDailyRecord {
//     date: string;
//     campaign_id: string;
//     campaign_name: string;
//     count: number;
//     unique: number;
//     sum_value: number;
// }

// interface CampaignDailyMetricsRecord {
//     date: string;
//     campaign_id: string;
//     campaign_name: string;
//     total_recipients: number;
//     unique_opens: number;
//     unique_clicks: number;
//     open_rate: number;
//     click_rate: number;
//     placed_order: number;
//     placed_order_value: number;
//     placed_order_rate: number;
//     bounced: number;
//     bounce_rate: number;
// }

// interface MetricAggregateResponseData {
//     attributes?: {
//         dates?: (string | Date)[];
//         data?: Array<{
//             dimensions?: string[];
//             measurements?: Record<string, number[]>;
//         }>;
//     };
// }

interface AudienceInfo {
    name: string;
    type: string;
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
    'text_message_spend',
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

    constructor() {
        this.reportingLimiter = new ReportingRateLimiter();
    }

    private initializeSession(privateKey: string) {
        if (!this.session) {
            const retry = new RetryWithExponentialBackoff({
                retryCodes: [429, 503, 504, 524],
                numRetries: 5,
                maxInterval: 120,
            });
            this.session = new ApiKeySession(privateKey, retry);
        }
    }

    // ─── Date helpers ───────────────────────────────────────────
    private get90DaysAgo(fromDate?: Date | string) {
        const baseDate = fromDate ? new Date(fromDate) : new Date();
        const d = new Date(baseDate);
        d.setUTCDate(d.getUTCDate() - 90);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

    private async fetchCampaignListByChannel(requestData: any, channel: 'email' | 'sms', statuses: string[] = ['Sent', 'Cancelled']  // 👈 Add as parameter with default
    ): Promise<unknown[]> {
        const start = `${requestData?.startDate}T00:00:00+00:00`;
        const end = `${requestData?.endDate}T23:59:59+00:00`;
        const statusesStr = statuses.map(s => `"${s}"`).join(',');

        const filter = `greater-or-equal(updated_at,${start}),less-or-equal(updated_at,${end}),equals(messages.channel,'${channel}'),any(status,[${statusesStr}])`;

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
            const data = ((body?.data ?? []) as unknown[]).map(item => ({
                ...(item as Record<string, unknown>),
                channel, // 👈 inject here
            }));
            const nextCursor = this.extractCursor(body);
            return { data, nextCursor };
        });
    }

    private async fetchCampaignList(requestData: string): Promise<unknown[]> {
        const [emailCampaigns, smsCampaigns] = await Promise.all([
            this.fetchCampaignListByChannel(requestData, 'email'),
            this.fetchCampaignListByChannel(requestData, 'sms'),
        ]);

        const seen = new Set<string>();
        const merged: unknown[] = [];
        for (const c of [...emailCampaigns, ...smsCampaigns]) {
            const id = (c as { id?: string })?.id;
            if (id && !seen.has(id)) {
                seen.add(id);
                merged.push(c);
            }
        }
        return merged;
    }

    // ─── Campaign Values Report─────────────────────────────────

    private async fetchCampaignValuesReport(requestData: any): Promise<unknown[]> {
        const start = requestData?.startDate;
        const end = requestData?.endDate;

        const statsToTry = [...ALL_CAMPAIGN_STATISTICS];

        const results: unknown[] = [];
        let pageCursor: string | undefined;

        const makeRequest = async (statistics: readonly string[]): Promise<void> => {
            do {
                await this.reportingLimiter.acquire();
                const api = new ReportingApi(this.session);
                const requestBody: CampaignValuesRequestDTO = {
                    data: {
                        type: 'campaign-values-report',
                        attributes: {
                            statistics: statistics as typeof ALL_CAMPAIGN_STATISTICS extends readonly (infer U)[] ? U[] : never,
                            timeframe: {
                                start: new Date(`${start}T00:00:00Z`),
                                end: new Date(`${end}T23:59:59Z`),
                            },
                            conversionMetricId: requestData?.conversionMetricId,
                            filter: `contains-any(send_channel,["email","sms"])`,
                        },
                    },
                };
                console.log("fetchCampaignValuesReport requestBody==>", requestBody);
                const resp = await api.queryCampaignValues(requestBody, {
                    pageCursor,
                });
                const body = resp.body as unknown as Record<string, unknown>;
                const reportData = body?.data as { attributes?: { results?: unknown[] } } | undefined;
                const reportResults = reportData?.attributes?.results ?? [];
                results.push(...reportResults);
                pageCursor = this.extractCursor(body);
            } while (pageCursor);
        };

        try {
            await makeRequest(statsToTry);
        } catch (err: any) {
            console.log("fetchCampaignValuesReport error==>", err?.response?.data?.errors);
            console.log("requestData==>", requestData);
            const isConversionMetricError =
                err &&
                typeof err === 'object' &&
                'response' in err &&
                (err as { response?: { status?: number } }).response?.status === 400;

            if (isConversionMetricError) {
                logger.warn('Klaviyo: Conversion metric not supported for campaign values, retrying without conversion stats');
                const CONVERSION_STATS = new Set([
                    'conversion_rate', 'conversion_uniques', 'conversion_value',
                    'conversions', 'average_order_value', 'revenue_per_recipient',
                ]);
                const basicStats = statsToTry.filter((s) => !CONVERSION_STATS.has(s));
                results.length = 0;
                pageCursor = undefined;
                await makeRequest(basicStats);
            } else {
                throw err;
            }
        }

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
            const extractIds = (entries?: unknown[]) => {
                if (!entries) return;
                for (const entry of entries) {
                    if (typeof entry === 'string') {
                        ids.add(entry);
                    } else if (entry && typeof entry === 'object') {
                        const id = (entry as { id?: string }).id;
                        if (id) ids.add(id);
                    }
                }
            };
            extractIds(audiences?.included);
            extractIds(audiences?.excluded);
        }
        return ids;
    }

    private async batchLookupSegments(ids: string[]): Promise<Map<string, AudienceInfo>> {
        if (ids.length === 0) return new Map();
        const nameMap = new Map<string, AudienceInfo>();

        const batchSize = 20;
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
                // console.log("resp==>",resp);
                const body = resp.body as unknown as Record<string, unknown>;
                const data = (body?.data ?? []) as Array<{
                    id: string;
                    type: "segment";
                    attributes?: { name?: string };
                }>;
                for (const item of data) {
                    if (item.id && item.attributes?.name) {
                        nameMap.set(item.id, {
                            name: item.attributes.name,
                            type: item.type
                        });
                    }
                }
                return { data, nextCursor: this.extractCursor(body) };
            });
        }
        return nameMap;
    }

    private async batchLookupLists(ids: string[]): Promise<Map<string, AudienceInfo>> {
        if (ids.length === 0) return new Map();
        const nameMap = new Map<string, AudienceInfo>();

        const batchSize = 20;
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
                    type: "list";
                    attributes?: { name?: string };
                }>;
                for (const item of data) {
                    if (item.id && item.attributes?.name) {
                        nameMap.set(item.id, {
                            name: item.attributes.name,
                            type: item.type
                        });
                    }
                }
                return { data, nextCursor: this.extractCursor(body) };
            });
        }
        return nameMap;
    }

    private async enrichAudiences(
        audienceIds: Set<string>
    ): Promise<Map<string, AudienceInfo | null>> {
        const allIds = Array.from(audienceIds);
        const nameMap = new Map<string, AudienceInfo | null>();

        const [segmentNames, listNames] = await Promise.all([
            this.batchLookupSegments(allIds),
            this.batchLookupLists(allIds),
        ]);

        for (const id of allIds) {
            const audience = segmentNames.get(id) ?? listNames.get(id) ?? null;
            nameMap.set(id, audience);
        }
        return nameMap;
    }

    // ─── Flow List (with pagination) ────────────────────────────

    private async fetchFlowsByIds(flowIds: string[]): Promise<unknown[]> {
        if (flowIds.length === 0) return [];
        const results: unknown[] = [];
        const batchSize = 20;
        for (let i = 0; i < flowIds.length; i += batchSize) {
            const batch = flowIds.slice(i, i + batchSize);
            const idsStr = batch.map((id) => `"${id}"`).join(',');
            const filter = `any(id,[${idsStr}])`;
            const batchResults = await this.paginateAll(async (cursor) => {
                const api = new FlowsApi(this.session);
                const resp = await api.getFlows({
                    fieldsFlow: ['name', 'status', 'archived', 'trigger_type'],
                    filter,
                    pageCursor: cursor,
                });
                const body = resp.body as unknown as Record<string, unknown>;
                const data = (body?.data ?? []) as unknown[];
                return { data, nextCursor: this.extractCursor(body) };
            });
            results.push(...batchResults);
        }
        return results;
    }

    private extractFlowIdsFromSeries(seriesResults: unknown[]): string[] {
        const ids = new Set<string>();
        for (const entry of seriesResults) {
            const row = entry as { groupings?: { flow_id?: string } };
            const flowId = row.groupings?.flow_id;
            if (flowId) ids.add(flowId);
        }
        return Array.from(ids);
    }

    // ─── Flow Series Report─────────────────────────────────────

    private async fetchFlowSeriesReport(
        requestData: any
    ): Promise<{ dateTimes: (string | Date)[]; results: unknown[] }> {
        const start = requestData?.startDate;
        const end = requestData?.endDate;

        let dateTimes: (string | Date)[] = [];
        const allResults: unknown[] = [];
        let pageCursor: string | undefined;

        const statsToTry = [...ALL_FLOW_STATISTICS];

        const makeRequest = async (statistics: readonly string[]): Promise<void> => {
            do {
                await this.reportingLimiter.acquire();
                const api = new ReportingApi(this.session);
                const requestBody: FlowSeriesRequestDTO = {
                    data: {
                        type: 'flow-series-report',
                        attributes: {
                            statistics: statistics as typeof ALL_FLOW_STATISTICS extends readonly (infer U)[] ? U[] : never,
                            timeframe: {
                                start: new Date(`${start}T00:00:00Z`),
                                end: new Date(`${end}T23:59:59Z`),
                            },
                            interval: 'daily',
                            conversionMetricId: requestData?.conversionMetricId,
                            filter: `contains-any(send_channel,["email","sms"])`,
                        },
                    },
                };
                console.log("fetchFlowSeriesReport requestBody==>", requestBody);
                const resp = await api.queryFlowSeries(requestBody, {
                    pageCursor,
                });
                const body = resp.body as unknown as Record<string, unknown>;
                const reportData = body?.data as {
                    attributes?: { dateTimes?: (string | Date)[]; results?: unknown[] };
                } | undefined;
                if (reportData?.attributes?.dateTimes) {
                    dateTimes = reportData.attributes.dateTimes;
                }
                const reportResults = reportData?.attributes?.results ?? [];
                allResults.push(...reportResults);
                pageCursor = this.extractCursor(body);
            } while (pageCursor);
        };

        try {
            await makeRequest(statsToTry);
        } catch (err: any) {
            console.log("fetchFlowSeriesReport error==>", err?.response?.data?.errors);
            console.log("requestData==>", requestData);
            const isConversionMetricError =
                err &&
                typeof err === 'object' &&
                'response' in err &&
                (err as { response?: { status?: number } }).response?.status === 400;

            if (isConversionMetricError) {
                logger.warn('Klaviyo: Conversion metric not supported for flow series, retrying without conversion stats');
                const CONVERSION_STATS = new Set([
                    'conversion_rate', 'conversion_uniques', 'conversion_value',
                    'conversions', 'average_order_value', 'revenue_per_recipient',
                ]);
                const basicStats = statsToTry.filter((s) => !CONVERSION_STATS.has(s));
                allResults.length = 0;
                pageCursor = undefined;
                await makeRequest(basicStats);
            } else {
                throw err;
            }
        }

        return { dateTimes, results: allResults };
    }

    // ─── Normalization: Campaigns ───────────────────────────────

    private normalizeCampaigns(
        rawCampaigns: unknown[],
        valuesReport: unknown[],
        audienceNameMap: Map<string, AudienceInfo | null>,
        requestData: any,
    ): NormalizedCampaign[] {
        const statsById = new Map<string, Record<string, unknown>>();
        for (const entry of valuesReport) {
            const e = entry as {
                groupings?: { campaign_id?: string };
                statistics?: Record<string, unknown>;
            };
            const campaignId = e.groupings?.campaign_id;
            const stats = e.statistics;
            if (campaignId && stats) {
                statsById.set(campaignId, stats);
            }
        }

        const normalized: NormalizedCampaign[] = [];
        for (const c of rawCampaigns) {
            const campaign = c as {
                id: string;
                channel?: string;
                attributes?: {
                    name?: string;
                    status?: string;
                    archived?: boolean;
                    sendTime?: string;
                    audiences?: {
                        included?: unknown[];
                        excluded?: unknown[];
                    };
                };
                relationships?: any;
            };

            const attrs = campaign.attributes ?? {};
            const rawSendTime = attrs.sendTime ?? '';
            const sendDate = rawSendTime ? new Date(rawSendTime).toISOString().split('T')[0] : '';

            if (sendDate && (sendDate < requestData?.startDate || sendDate > requestData?.endDate)) {
                continue;
            }

            const buildAudienceMap = (
                entries?: unknown[]
            ): Record<string, AudienceInfo> => {
                const result: Record<string, { name: string | null, type: string | null }> = {};
                if (!entries) return result;
                for (const entry of entries) {
                    let id: string | undefined;
                    if (typeof entry === 'string') {
                        id = entry;
                    } else if (entry && typeof entry === 'object') {
                        id = (entry as { id?: string }).id;
                    }
                    if (id) {
                        const audience = audienceNameMap.get(id);
                        result[id] = { name: audience?.name ?? null, type: audience?.type ?? null };
                    }
                }
                return result;
            };

            normalized.push({
                id: campaign.id,
                name: attrs.name ?? '',
                type: 'campaign',
                channel: campaign.channel ?? '',
                send_time: sendDate,
                status: attrs.status ?? '',
                archived: attrs.archived ?? false,
                message_id: campaign?.relationships?.campaignMessages?.data?.[0]?.id,
                audiences: {
                    included: buildAudienceMap(attrs.audiences?.included),
                    excluded: buildAudienceMap(attrs.audiences?.excluded),
                },
                statistics: statsById.get(campaign.id) ?? {},
            });
        }
        return normalized;
    }

    // ─── Normalization: Flows ───────────────────────────────────

    private normalizeFlows(
        rawFlows: unknown[],
        dateTimes: (string | Date)[],
        seriesResults: unknown[]
    ): NormalizedFlow[] {
        const flowMeta = new Map<
            string,
            { name: string; status: string; archived: boolean }
        >();

        for (const f of rawFlows) {
            const flow = f as {
                id: string;
                attributes?: {
                    name?: string;
                    status?: string;
                    archived?: boolean;
                };
            };

            flowMeta.set(flow.id, {
                name: flow.attributes?.name ?? '',
                status: flow.attributes?.status ?? '',
                archived: flow.attributes?.archived ?? false,
            });
        }

        const normalized: NormalizedFlow[] = [];

        for (const entry of seriesResults) {
            const row = entry as {
                groupings?: { flow_id?: string };
                statistics?: Record<string, number[]>;
            };

            const flowId = row.groupings?.flow_id;
            if (!flowId || !flowMeta.has(flowId)) continue;

            const meta = flowMeta.get(flowId)!;
            const measurements = row.statistics ?? {};

            for (let i = 0; i < dateTimes.length; i++) {
                const dt = dateTimes[i];
                const iso = dt instanceof Date ? dt.toISOString() : String(dt);
                const date = iso.split('T')[0];

                const stats: Record<string, number> = {};
                for (const [key, values] of Object.entries(measurements)) {
                    if (Array.isArray(values) && values[i] !== undefined) {
                        stats[key] = values[i];
                    }
                }

                normalized.push({
                    id: flowId,
                    name: meta.name,
                    type: 'flow',
                    status: meta.status,
                    archived: meta.archived,
                    date,
                    statistics: stats,
                });
            }
        }

        return normalized;
    }



    // ═══════════════════════════════════════════════════════════
    // PUBLIC API — New methods (campaigns + flows + audience)
    // ═══════════════════════════════════════════════════════════

    async getCampaignsWithMetrics(requestData: any): Promise<NormalizedCampaign[]> {
        try {
            logger.info('Klaviyo: Fetching campaign list...');
            const campaignRequestData = {
                ...requestData,
                startDate: this.get90DaysAgo(requestData?.endDate),
            };
            const rawCampaigns = await this.fetchCampaignList(campaignRequestData);
            logger.info(`Klaviyo: Fetched ${rawCampaigns.length} campaigns`);

            logger.info('Klaviyo: Fetching campaign values report...');
            const valuesReport = await this.fetchCampaignValuesReport(campaignRequestData);
            logger.info(`Klaviyo: Fetched ${valuesReport.length} campaign value entries`);

            logger.info('Klaviyo: Enriching audience names...');
            const audienceIds = this.collectAudienceIds(rawCampaigns);
            logger.info(`Klaviyo: Found ${audienceIds.size} unique audience IDs to resolve`);
            const audienceNameMap = await this.enrichAudiences(audienceIds);

            const campaigns = this.normalizeCampaigns(rawCampaigns, valuesReport, audienceNameMap, campaignRequestData);
            logger.info(`Klaviyo: Normalized ${campaigns.length} campaigns with metrics`);
            return campaigns;
        } catch (error) {
            logger.error(error, 'Error in KlaviyoService.getCampaignsWithMetrics');
            await ErrorLogs.insertOne({
                client_id: requestData?.clientId,
                connection_id: requestData?.connectionId,
                network: "klaviyo",
                start_date: requestData?.startDate,
                end_date: requestData?.endDate,
                error: JSON.stringify(error)
            });
            throw new Error('Error fetching Klaviyo campaigns with metrics');
        }
    }

    async getFlowsWithMetrics(requestData: any): Promise<NormalizedFlow[]> {
        try {
            logger.info('Klaviyo: Fetching flow series report...');
            const seriesReport = await this.fetchFlowSeriesReport(requestData);
            logger.info(`Klaviyo: Fetched ${seriesReport.results.length} flow series entries across ${seriesReport.dateTimes.length} dates`);

            const flowIds = this.extractFlowIdsFromSeries(seriesReport.results);
            logger.info(`Klaviyo: Found ${flowIds.length} unique flow IDs in series data`);

            logger.info('Klaviyo: Fetching flow metadata for matched flows...');
            const rawFlows = await this.fetchFlowsByIds(flowIds);
            logger.info(`Klaviyo: Fetched metadata for ${rawFlows.length} flows`);

            const flows = this.normalizeFlows(rawFlows, seriesReport.dateTimes, seriesReport.results);
            logger.info(`Klaviyo: Normalized ${flows.length} flows (grouped by flow_id)`);
            return flows;
        } catch (error) {
            // logger.error(error, 'Error in KlaviyoService.getFlowsWithMetrics');
            throw new Error('Error fetching Klaviyo flows with metrics');
        }
    }

    async fetchKlaviyoRecords(requestData: {
        privateKey?: string;
        startDate?: string;
        endDate?: string;
        clientId?: string;
        connectionId?: string;
        [key: string]: unknown;
    }): Promise<{
        campaigns: NormalizedCampaign[];
        flows: NormalizedFlow[];
    }> {

        if (!requestData?.privateKey) {
            throw new Error("Klaviyo private key is required");
        }
        this.initializeSession(requestData.privateKey as string);

        const [campaigns, flows] = await Promise.all([
            this.getCampaignsWithMetrics(requestData),
            this.getFlowsWithMetrics(requestData),
        ]);

        if (requestData?.clientId && requestData?.connectionId) {
            const recordsByDate: Record<string, { campaigns: NormalizedCampaign[]; flows: NormalizedFlow[] }> = {};

            for (const campaign of campaigns) {
                const date = campaign.send_time || requestData?.startDate || '';
                if (!date) continue;
                if (!recordsByDate[date]) {
                    recordsByDate[date] = { campaigns: [], flows: [] };
                }
                recordsByDate[date].campaigns.push(campaign);
            }

            for (const flow of flows) {
                const date = flow.date || requestData?.startDate || '';
                if (!date) continue;
                if (!recordsByDate[date]) {
                    recordsByDate[date] = { campaigns: [], flows: [] };
                }
                recordsByDate[date].flows.push(flow);
            }
            // logger.info(recordsByDate,'recordsByDate');
            try {
                await this.captureToCentralStorage(
                    recordsByDate,
                    requestData.clientId,
                    requestData.connectionId,
                    'klaviyo'
                );
                logger.info(`Klaviyo: Stored ${Object.keys(recordsByDate).length} days of records to central storage`);
            } catch (error) {
                logger.error(error, 'Error storing Klaviyo records to central storage');
            }
        }

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

    async getMetrices(requestData) {
        try {
            if (!requestData?.privateKey) {
                throw new Error("Klaviyo private key is required");
            }
            this.initializeSession(requestData.pvtkey as string);
            const metrices = new MetricsApi(this.session);
            const metricesList = await metrices.getMetrics();
            return metricesList?.body?.data;
        } catch (error) {
            throw error?.response;
        }
    }

    async getCampaigns(requestData: any) {
        try {
            const startStr = `${requestData?.startDate}T00:00:00`;
            const endStr = `${requestData?.endDate}T23:59:59`;
            const filter = `greater-or-equal(updated_at,${startStr}),less-or-equal(updated_at,${endStr}),equals(messages.channel,'sms'),any(status,['Sent','Cancelled'])`;
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

    async captureToCentralStorage(records, clientId, connectionId, network) {
        const bulkOpsByYear: any[] = [];

        Object.entries(records).forEach(([date, recordsByDate]) => {

            const dateObj = new Date(date);
            dateObj.setUTCHours(0, 0, 0, 0);
            const year = dateObj.getUTCFullYear();

            if (!bulkOpsByYear[year]) {
                bulkOpsByYear[year] = [];
            }

            const setObj: Record<string, unknown> = {};
            const dataRecord = recordsByDate as Record<string, unknown>;
            for (const [key, value] of Object.entries(dataRecord)) {
                if (Array.isArray(value) && value.length > 0) {
                    setObj[`data.${key}`] = value;
                }
            }

            if (Object.keys(setObj).length === 0) {
                return;
            }

            bulkOpsByYear[year].push({
                updateOne: {
                    filter: {
                        client_id: getMongoDbObjectId(clientId),
                        connection_id: getMongoDbObjectId(connectionId),
                        network: network,
                        date: new Date(date),
                    },
                    update: {
                        $setOnInsert: {
                            client_id: getMongoDbObjectId(clientId),
                            connection_id: getMongoDbObjectId(connectionId),
                            network: network,
                            date: new Date(date),
                        },
                        $set: setObj,
                    },
                    upsert: true,
                },
            });
        });

        // Execute bulkWrite per year
        for (const [year, bulkOps] of Object.entries(bulkOpsByYear)) {
            if (!bulkOps.length) continue;

            const modelName = getCentralStorageModel(`central_storage_${year}`);
            try {
                await modelName.bulkWrite(bulkOps, { ordered: false });
            } catch (err: any) {
                if (err.mongoose?.validationErrors) {
                    err.mongoose.validationErrors.forEach((e: any, index: number) => {
                        logger.error(e.message, "klaviyo storage Error Message:");
                    });
                } else {
                    logger.error(err, "klaviyo storage Error: ");
                }
            }

        }
        return true;
    }


    async getDraftCampaignsForCalendar(
        requestData: { startDate: string; endDate: string, privateKey?: string },
        channel: 'email' | 'sms' = 'email',
        statuses: string[] = ['Draft'],
        enrichAudiences: boolean = false
    ): Promise<NormalizedCampaign[]> {
        try {

            if (!requestData?.privateKey) {
                throw new Error("Klaviyo private key is required");
            }
            this.initializeSession(requestData.privateKey as string);


            logger.info(`Klaviyo: Fetching ${statuses.join(', ')} campaigns for channel: ${channel}`);

            const rawCampaigns = await this.fetchCampaignListByChannel(
                requestData,
                channel,
                statuses
            );

            logger.info(`Klaviyo: Fetched ${rawCampaigns.length} campaigns`);

            let audienceNameMap = new Map<string, AudienceInfo | null>();

            if (enrichAudiences) {
                const audienceIds = this.collectAudienceIds(rawCampaigns);
                logger.info(`Klaviyo: Found ${audienceIds.size} unique audience IDs to resolve`);
                audienceNameMap = await this.enrichAudiences(audienceIds);
            }

            // Normalize campaigns (without statistics for drafts)
            const normalized: NormalizedCampaign[] = [];

            for (const c of rawCampaigns) {
                const campaign = c as {
                    id: string;
                    channel?: string;
                    attributes?: {
                        name?: string;
                        status?: string;
                        archived?: boolean;
                        sendTime?: string;
                        audiences?: {
                            included?: unknown[];
                            excluded?: unknown[];
                        };
                    };
                    relationships?: {
                        campaignMessages?: {
                            data?: Array<{ id?: string }>;
                        };
                    };
                };

                const attrs = campaign.attributes ?? {};

                const buildAudienceMap = (
                    entries?: unknown[]
                ): Record<string, AudienceInfo> => {
                    const result: Record<string, AudienceInfo> = {};
                    if (!entries) return result;
                    for (const entry of entries) {
                        let id: string | undefined;
                        if (typeof entry === 'string') {
                            id = entry;
                        } else if (entry && typeof entry === 'object') {
                            id = (entry as { id?: string }).id;
                        }
                        if (id) {
                            const audience = audienceNameMap.get(id);
                            result[id] = {
                                name: audience?.name ?? null,
                                type: audience?.type ?? null,
                            };
                        }
                    }
                    return result;
                };

                normalized.push({
                    id: campaign.id,
                    name: attrs.name ?? '',
                    type: 'campaign',
                    channel: campaign.channel ?? channel,
                    send_time: attrs.sendTime ?? '',
                    status: attrs.status ?? '',
                    archived: attrs.archived ?? false,
                    message_id: campaign.relationships?.campaignMessages?.data?.[0]?.id ?? '',
                    audiences: {
                        included: buildAudienceMap(attrs.audiences?.included),
                        excluded: buildAudienceMap(attrs.audiences?.excluded),
                    },
                    statistics: {}, // Drafts don't have statistics
                });
            }

            logger.info(`Klaviyo: Normalized ${normalized.length} campaigns`);
            return normalized;
        } catch (error) {
            logger.error(error, 'Error in KlaviyoService.getDraftCampaignsForCalendar');
            throw new Error('Error fetching Klaviyo draft campaigns');
        }
    }
}

export { KlaviyoService as klaviyoService };