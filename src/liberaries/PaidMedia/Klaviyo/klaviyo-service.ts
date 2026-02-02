import { ApiKeySession,
         ProfilesApi,
         MetricsApi, 
         CampaignsApi, 
         FlowsApi,
        ReportingApi,
        RetryWithExponentialBackoff,
        FlowSeriesRequestDTO 
    } 
from 'klaviyo-api';
import logger from '../../../utils/logger';

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
}

