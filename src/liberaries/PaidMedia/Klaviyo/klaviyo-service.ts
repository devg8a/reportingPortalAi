import { ApiKeySession,
         ProfilesApi,
         MetricsApi, 
         CampaignsApi, 
         FlowsApi,
        ReportingApi,
        RetryWithExponentialBackoff,
        FlowSeriesRequestDTO,
        MetricAggregateQuery
    } 
from 'klaviyo-api';
import logger from '../../../utils/logger';

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

interface CampaignDailyReport {
    campaign_id: string;
    campaign_name: string;
    daily_metrics: DailyMetricRecord[];
}

interface CampaignDailyRecord {
    date: string;
    campaign_id: string;
    campaign_name: string;
    count: number;
    unique: number;
    sum_value: number;
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

/**
 * https://developers.klaviyo.com/en/docs/sdk_overview
 * https://www.npmjs.com/package/klaviyo-api
 */

export class klaviyoService{
    private session : ApiKeySession;
    private retry   : RetryWithExponentialBackoff;

    constructor(privateKey){
        this.retry   = new RetryWithExponentialBackoff({ retryCodes: [429, 503, 504, 524], numRetries: 3, maxInterval: 60})
        this.session = new ApiKeySession(privateKey,this.retry);
    }

    async getProfiles(){
        try{
            const profilesApi = new ProfilesApi(this.session);
            const profileList = await profilesApi.getProfiles();
            return profileList?.body?.data;
        }catch(error){
            logger.info(error);
            throw new Error("Error in klaviyo getProfiles API");
        }
    }

    async getMetrices(){
        try{
            const metrices     = new MetricsApi(this.session);
            const metricesList = await metrices.getMetrics();
            return metricesList?.body?.data;
        }catch(error){
            logger.info(error);
            throw new Error("Error in klaviyo getMetrices API");
        }
    }

    async getCampaigns(){
        try{
            const filter = `greater-or-equal(updated_at,2026-01-01T00:00:00),less-or-equal(updated_at,2026-01-27T23:59:59),equals(messages.channel,'email')`;
            const fieldsCampaign = [
                "updated_at",
                "archived",
                "id",
                "name",
                "send_time",
                "status",
                "send_strategy",
                "audiences",
            ];
            const campaigns     = new CampaignsApi(this.session);
            const campaignsList = await campaigns.getCampaigns(filter);
            return campaignsList?.body?.data;
        }catch(error){
            logger.info(error);
            throw new Error("Error in klaviyo getMetrices API");
        }
    }

    async getFlows(){
        try{
            const flows     = new FlowsApi(this.session);
            const flowsList = await flows.getFlows();
            return flowsList?.body?.data;
        }catch(error){
            logger.info(error);
            throw new Error("Error in klaviyo getFlows API");
        }
    }

    async reporting(){
        try{
            const reports  = new ReportingApi(this.session); 
            // const flowSeriesRequest: FlowSeriesRequestDTO = {
            //     type: 'flow-series-report',
            //     attributes: {
            //         statistics: ['opens', 'open_rate'],
            //         timeframe: {key: 'last_12_months'},
            //         interval: 'weekly',
            //         conversion_metric_id: 'RESQ6t',
            //         filter: 'and(equals(flow_id,"abc123"),contains-any(send_channel,["email","sms"]))'
            //     }
            // };
            // const response = reports.queryFlowSeries((flowSeriesRequestDTO: FlowSeriesRequestDTO, options))
        }catch(error){
            logger.info(error);
            throw new Error("Error in klaviyo Reporting API");
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
                            `less-than(datetime,${endDateTime})`
                        ],
                        timezone: timezone
                    }
                }
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

    async getCampaignDailyReport(requestData: CampaignReportRequest): Promise<CampaignDailyRecord[]> {
        try {
            const { startDate, endDate, metricId, timezone = 'UTC' } = requestData;
            
            const metricsApi = new MetricsApi(this.session);
            
            let targetMetricId = metricId;
            if (!targetMetricId) {
                const metricsList = await metricsApi.getMetrics();
                const placedOrderMetric = metricsList?.body?.data?.find(
                    (m: { attributes?: { name?: string } }) => m.attributes?.name === 'Placed Order'
                );
                if (placedOrderMetric) {
                    targetMetricId = placedOrderMetric.id;
                } else {
                    throw new Error('Could not find Placed Order metric. Please provide a metricId.');
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
                            `less-than(datetime,${endDateTime})`
                        ],
                        timezone: timezone
                    }
                }
            };

            const response = await metricsApi.queryMetricAggregates(metricAggregateQuery);
            const rawData = response?.body?.data as MetricAggregateResponseData;

            const campaignDailyRecords = this.transformToCampaignDailyRecords(rawData);

            return campaignDailyRecords;
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
                'Unsubscribed'
            ];
            
            const targetMetrics = metricsData.filter(
                (m: { attributes?: { name?: string } }) => 
                    targetMetricNames.includes(m.attributes?.name || '')
            );

            const startDateTime = `${startDate}T00:00:00`;
            const endDateTime = `${endDate}T23:59:59`;

            const results: Record<string, { date: string; metrics: Record<string, { count: number; unique: number; sum_value: number }> }> = {};

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
                                `less-than(datetime,${endDateTime})`
                            ],
                            timezone: timezone
                        }
                    }
                };

                const response = await metricsApi.queryMetricAggregates(metricAggregateQuery);
                const rawData = response?.body?.data;

                const responseData = rawData as MetricAggregateResponseData;
                const dates = responseData?.attributes?.dates || [];
                const data = responseData?.attributes?.data || [];

                for (let i = 0; i < dates.length; i++) {
                    const dateVal = dates[i];
                    const dateStr = typeof dateVal === 'string' 
                        ? dateVal.split('T')[0] 
                        : dateVal instanceof Date 
                            ? dateVal.toISOString().split('T')[0]
                            : String(dateVal).split('T')[0];
                    
                    if (!results[dateStr]) {
                        results[dateStr] = {
                            date: dateStr,
                            metrics: {}
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
                        const dateStr = typeof dateVal === 'string' 
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

            const dailyRecords = Object.values(results).sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
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
                const dateStr = typeof dateVal === 'string' 
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
                        sum_value: sumValue
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
            const dateStr = typeof dateVal === 'string' 
                ? dateVal.split('T')[0] 
                : dateVal instanceof Date 
                    ? dateVal.toISOString().split('T')[0]
                    : String(dateVal).split('T')[0];
            
            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = {
                    date: dateStr,
                    count: 0,
                    unique: 0,
                    sum_value: 0
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
                const dateStr = typeof dateVal === 'string' 
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

        return Object.values(dailyMap).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }
}

