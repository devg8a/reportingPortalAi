import Integrations from "../db/models/integrations";
import { RakutenService  } from "../liberaries/Affiliate/Rakuten/rakuten-service";
import { PepperjamService  } from "../liberaries/Affiliate/Pepperjam/pepperjam-service";
import { ImpactService  } from "../liberaries/Affiliate/Impact/impact-service";
import { AwinService  } from "../liberaries/Affiliate/Awin/awin-service";
import { AvantlinkService  } from "../liberaries/Affiliate/Avantlink/avantlink-service";
import { CjService } from "../liberaries/Affiliate/Cj/cj-service";
import { LevantaService } from "../liberaries/Affiliate/Levanta/levanta-service";
import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service"
import { getDateRange } from "../helper/helper";

export const allStoresNetworkData = async (clientId = null, network = null) =>{
	try{
		const clientsIntegrationsList = await Integrations.find({
			...(clientId && { client_id: clientId }),
			...(network && { network }),
		}).populate('client_id','client_id name').lean();
		if(clientsIntegrationsList.length){
			const requestData = {};
			const response    = {};
			const dateRange   = getDateRange();
			for (const integration of clientsIntegrationsList) {
				let inClientId = integration?.client_id?._id?.toString();
				const network  = integration?.network;
				switch(network){
					case 'rakuten' : 
						const rakuten        = new RakutenService();
						requestData[inClientId] = {
					        authToken : integration.token,
					        startDate : dateRange.start_date,
					        endDate   : '2025-12-02',
					        // end_date: dateRange.end_date,
					        clientId  : inClientId,
					    };
						response[inClientId] = await rakuten.transactionList(requestData[inClientId]);
					break;

					case 'pepperjam' : 
						const perpperjam     = new PepperjamService();
						requestData[inClientId] = {
					        apiKey    : integration.token,
					        version   : integration.version,
					        clientId  : inClientId,
					        startDate : dateRange.start_date,
					        endDate   : '2025-12-02',
					    };
						response[inClientId] = await perpperjam.transactionList(requestData[inClientId]);
						// response[inClientId] = await perpperjam.publishersList(requestData[inClientId]);
					break;

					case 'impact' : 
						const impact = new ImpactService();
						requestData[inClientId] = {
					        programId : integration.program_id,
					        accountId : integration.value,
					        authToken : integration.token,
					        clientId  : inClientId,
					        startDate : dateRange.start_date,
					        endDate   : '2025-12-07',
					    };
						// response[inClientId] = await impact.transactionList(requestData[inClientId]);
						response[inClientId] = await impact.publisherList(requestData[inClientId]);
						// response[inClientId] = await impact.accountInfo(requestData[inClientId]);
					break;

					case 'awin' : 
						const awin = new AwinService();
						requestData[inClientId] = {
					        accountId  : integration.value,
					        authToken  : integration.token,
					        timezone   : integration.timezone,
					        clientId   : inClientId,
					        startDate  : dateRange.start_date,
					        endDate    : '2025-12-02',
					    };
						response[inClientId] = await awin.transactionList(requestData[inClientId]);
						// response[inClientId] = await awin.publishersList(requestData[inClientId]);
						// response[inClientId] = await awin.accountInfo(requestData[inClientId]);
					break;
				
					case 'avantlink' : 
						const avantlink = new AvantlinkService();
						requestData[inClientId] = {
					        accountId  : integration.value,
					        authKey    : integration.token,
					        clientId   : inClientId,
					        startDate  : '2025-12-01',
					        endDate    : '2025-12-02',
					    };
						// response[inClientId] = await avantlink.publisherList(requestData[inClientId]);
						response[inClientId] = await avantlink.transactionList(requestData[inClientId]);
					break;

					case 'cj' : 
						const cj = new CjService();
						requestData[inClientId] = {
					        accountId  : integration.value,
					        clientId   : inClientId,
					        startDate  : '2025-12-01',
					        endDate    : '2025-12-02',
					    };
						response[inClientId] = await cj.transactionList(requestData[inClientId]);
					break;

					case 'levanta' : 
						const levanta = new LevantaService();
						requestData[inClientId] = {
					        apiKey    : integration.value,
					        clientId  : inClientId,
					        startDate : '2025-12-01',
					        endDate   : '2025-12-02',
					    };
						response[inClientId] = await levanta.publisherList(requestData[inClientId]);
					break;

					case 'shopify' : 
						const shopify = new ShopifyService();
						requestData[inClientId] = {
					        storeUrl    : integration.value,
							accessToken : integration.token,
							startDate : '2025-12-01',
					        endDate   : '2025-12-02',
					    };
						response[inClientId] = await shopify.salesreport(requestData[inClientId]);
						// response[inClientId] = await shopify.storeDetailsApi(requestData[inClientId]);
					break;
				}
			}

			// if(Object.keys(requestDataList).length){
			// 	console.log('requestDataList==>',requestDataList);
			// }
			// response[inClientId] = await rakuten.transactionList(requestData[inClientId]);
			// console.log('allClientNetworkData response==>',response)
			return response;
		}
	}catch(error){
		console.error("Error==>",error);
	}
}