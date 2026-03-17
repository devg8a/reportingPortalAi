/**PAID MEDIA NETWORKS**/
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";
import { analyticsDataService } from "../liberaries/PaidMedia/GA4/analyticsDataLib";
import { AdwordService } from "../liberaries/PaidMedia/Adword/AdwordLib";
import { CriteoService } from "../liberaries/PaidMedia/Criteo/CriteoLib";
import { BingService } from "../liberaries/PaidMedia/Bing/BingLib";
import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import { KlaviyoService } from "../liberaries/PaidMedia/Klaviyo/klaviyo-service";
/**AFFILIATE NETWORKS**/
import { ImpactService } from "../liberaries/Affiliate/Impact/impact-service";
import { RakutenService } from "../liberaries/Affiliate/Rakuten/rakuten-service";
import { PepperjamService } from "../liberaries/Affiliate/Pepperjam/pepperjam-service";
import { AwinService } from "../liberaries/Affiliate/Awin/awin-service";
import { AvantlinkService } from "../liberaries/Affiliate/Avantlink/avantlink-service";
import { CjService } from "../liberaries/Affiliate/Cj/cj-service";
import { LevantaService } from "../liberaries/Affiliate/Levanta/levanta-service";

export const NETWORK_REGISTRY: any = {

  shopify: {
    service: new ShopifyService(),
    method: "salesreport",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      storeUrl   : connectionData?.value,
      accessToken: connectionData?.token
    })
  },

  meta: {
    service: new MetaService(),
    method: "getMetaAccountData",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId: connectionData?.value
    })
  },

  ga: {
    service: new analyticsDataService(),
    method: "fetchAnalyticsReport",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId: connectionData?.value
    })
  },

  adword: {
    service: new AdwordService(),
    method: "adwordReport",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      customerId: connectionData?.value
    })
  },

  bing: {
    service: new BingService(),
    method: "generateReport",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId: connectionData?.value
    })
  },

  criteo: {
    service: new CriteoService(),
    method: "getStatisticsReport",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId: connectionData?.value
    })
  },

  klaviyo: {
    // Create a new KlaviyoService instance per request to avoid cross-client
    // session/conversionMetricId contamination when processing concurrently
    get service() { return new KlaviyoService(); },
    method: "fetchKlaviyoRecords",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      privateKey: connectionData?.value,
      conversionMetricId: connectionData?.token
    })
  },

  awin: {
    service: new AwinService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId : connectionData?.value,
      authToken : connectionData?.token,
      timezone  : connectionData?.timezone,
    })
  },

  impact: {
    service: new ImpactService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      programId : connectionData?.program_id,
      accountId : connectionData?.value,
      authToken : connectionData?.token,
    })
  },

  rakuten: {
    service: new RakutenService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      authToken : connectionData?.value
    })
  },

  cj: {
    service: new CjService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId : connectionData?.value
    })
  },

  avantlink: {
    service: new AvantlinkService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      accountId : connectionData?.value,
      authKey   : connectionData?.token,
    })
  },

  levanta: {
    service: new LevantaService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      apiKey : connectionData?.value,
    })
  },

  pepperjam: {
    service: new PepperjamService(),
    method: "transactionList",
    buildParams: (connectionData:any) => ({
      connectionId: connectionData?._id,
      clientId: connectionData?.client_id,
      network: connectionData?.network,
      apiKey : connectionData?.value,
    })
  }

};
