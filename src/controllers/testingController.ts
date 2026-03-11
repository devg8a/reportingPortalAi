import Integrations from "../db/models/integrations";
import { allStoresNetworkData } from '../jobs/allStoresJob';
import ClientIcp from "../db/models/clientIcp";
import { readGoogleSheet } from "../liberaries/Google/SpreadSheet/Connection/accounts";
import { AnalyticsAdminService } from '../liberaries/PaidMedia/GA4/analyticsAdminLib';
import { analyticsDataService } from '../liberaries/PaidMedia/GA4/analyticsDataLib';
import { MetaService } from '../liberaries/PaidMedia/Meta/metaLib';
import { AdwordService } from '../liberaries/PaidMedia/Adword/AdwordLib';
import { CriteoService } from "../liberaries/PaidMedia/Criteo/CriteoLib";
import { BingService } from "../liberaries/PaidMedia/Bing/BingLib";
import { ShopifyService } from "../liberaries/PaidMedia/Shopify/shopify-service";
import redisClient from '../config/redisClient';
import { MondayService } from "../liberaries/Monday/mondayLib";
import { getCentralStorageModel } from "../db/schema/dynamic-central-model";
import { ObjectId } from 'mongodb';
import logger from '../utils/logger';
import clientDetails from "../db/models/clientDetails";
import { SheetLib } from "../liberaries/GoogleSheet/sheetLib";
import { klaviyoService } from "../liberaries/PaidMedia/Klaviyo/klaviyo-service";
import captureToCentralStorage from "../liberaries/central-storage-service";
import {CjService} from "../liberaries/Affiliate/Cj/cj-service"

export const affiliateNetworkTestingApi = async (req, res) => {
	try {
		const clientId = req?.body?.client_id;
		const network = req?.body?.network;
		const storesIntegrations = await Integrations.find({
			...(clientId && { client_id: clientId }),
			...(network && { network }),
		}).populate('client_id', 'client_id name').lean();
		const finalResult = await allStoresNetworkData(clientId, network);
		res.status(200).json({ status_code: 200, success: true, message: 'Integrations fetched successfull', data: finalResult });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in Integrations', data: error });
	}
}

export const intgrationStore = async (req, res) => {
	try {
		const integrationData = await Integrations.create({
			client_id: req.body.client_id,
			network: req.body.network,
			value: req.body.store_url,
			token: req.body.access_token
			//   account_id   : req.body.account_id,
			//   auth_key     : req.body.auth_key,
		});
		res.status(200).json({ status_code: 200, success: true, message: 'Integrations stored successfully', data: integrationData });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in Integrations', data: error });
	}
}

export const createStore = async (req, res) => {
	try {
		const storeData = await clientDetails.create({
			name: req.body.name,
			status: req.body.status,
		});

		res.status(200).json({ status_code: 200, success: true, message: 'Store stored successfully', data: storeData });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in create Store', data: error });
	}
}

export const fetchActiveClientList = async (req, res) => {
	try {
		const icpList = await ClientIcp.find({}).lean();
		res.status(200).json({ status_code: 200, success: true, message: 'Active Client List fetched successfully', data: icpList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in Active Client List', data: error });
	}
}

export const impactJobCompletionWebhook = async (req, res) => {

	try {
		logger.info(req, 'reqBody: ');
		const webhookResponse = req?.body;
		res.status(200).json({ status_code: 200, success: true, message: 'Active Client List fetched successfully', data: webhookResponse });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in Active Client List', data: error });
	}
}

export const readSpreadSheet = async (req, res) => {
	try {
		const sheetLib = new SheetLib();
		const sheetDataList = await sheetLib.readGoogleSheet(req?.body?.sheetId, req?.body?.tabName);
		res.status(200).json({ status_code: 200, success: true, message: 'Google sheet fetched successfully.', data: sheetDataList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in read spreadsheet.', data: error });
	}
}

export const fetchGaAccounts = async (req, res) => {
	try {
		const analyticsAdmin = new AnalyticsAdminService();
		const ga4AccountList = await analyticsAdmin.listAccounts();
		res.status(200).json({ status_code: 200, success: true, message: 'GA4 Accounts fetched successfully.', data: ga4AccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreving GA4 accounts.', data: error });
	}
}

export const gaAnalyticsReport = async (req, res) => {
	try {
		const requestData = {
			accountId: req?.body?.accountId,
			startDate: req?.body?.startDate,
			endDate: req?.body?.endDate,
			clientId: req?.body?.clientId,
			connectionId: req?.body?.connectionId,
		}
		const analytics = new analyticsDataService();
		const ga4DataList = await analytics.fetchAnalyticsReport(requestData);
		res.status(200).json({ status_code: 200, success: true, message: 'GA4 Data fetched successfully', data: ga4DataList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving GA4 data.', data: error });
	}
}

export const shopifyReport = async (req, res) => {
	try {
		const requestData = {
			storeUrl: req?.body?.storeUrl,
			accessToken: req?.body?.accessToken,
			startDate: req?.body?.startDate,
			endDate: req?.body?.endDate,
			clientId: req?.body?.clientId,
			connectionId: req?.body?.connectionId,
		}
		const shopify = new ShopifyService();
		const shopifyResponse = await shopify.salesreport(requestData);
		res.status(200).json({ status_code: 200, success: true, message: 'Shopify Data fetched successfully', data: shopifyResponse });
	} catch (error) {
		logger.error(error, "shopif error");
	}
}

export const fetchMetaAccounts = async (req, res) => {
	try {
		const metaLib = new MetaService();
		const metaAccountList = await metaLib.getMetaAccounts();
		res.status(200).json({ status_code: 200, success: true, message: 'Meta Accounts fetched successfully', data: metaAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving GA4 data.', data: error });
	}
}

export const metaInsightReport = async (req, res) => {
	try {
		const requestData = {
			accountId: req?.body?.accountId,
			startDate: req?.body?.startDate,
			endDate: req?.body?.endDate,
			clientId: req?.body?.clientId,
		}
		const metaLib = new MetaService();
		const metaAccountData = await metaLib.getMetaAccountData(requestData);
		res.status(200).json({ status_code: 200, success: true, message: 'Meta Account Data fetched successfully.', data: metaAccountData });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving GA4 data.', data: error });
	}
}

export const fetchAdwordAccounts = async (req, res) => {
	try {
		const adwordLib = new AdwordService();
		const adwordAccountList = await adwordLib.getAllAccounts();
		res.status(200).json({ status_code: 200, success: true, message: 'Adword Accounts fetched successfully.', data: adwordAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Adword Accounts.', data: error });
	}
}

export const fetchAdwordReport = async (req, res) => {
	try {
		const requestData = {
			customerId: req.body.customerId,
			startDate: req.body.startDate,
			endDate: req.body.endDate,
			adGroupIds: req.body.adGroupIds,       // [1587..., 1461..., ...]
			assetGroupIds: req.body.assetGroupIds, // [6477..., 6530..., ...]
		}
		const adwordLib = new AdwordService();
		// const adwordAccountData = await adwordLib.adwordReport(requestData);
		const adwordAccountData = await adwordLib.performanceReport(requestData);
		console.log('adwordAccountData==>', adwordAccountData);
		res.status(200).json({ status_code: 200, success: true, message: 'Adword Account Report fetched successfully.', data: adwordAccountData });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Adword Account Report.', data: error });
	}
}

export const fetchCriteoAccounts = async (req, res) => {
	try {
		const criteoLib = new CriteoService();
		const criteoAccountList = await criteoLib.getAllAccounts();
		res.status(200).json({ status_code: 200, success: true, message: 'Criteo Account Report fetched successfully.', data: criteoAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Criteo Account Report.', data: error });
	}
}

export const fetchCriteoReport = async (req, res) => {
	try {
		const requestData = {
			accountId: req.body.accountId,
			startDate: req.body.startDate,
			endDate: req.body.endDate
		}
		const criteoLib = new CriteoService();
		const criteoAccountList = await criteoLib.getStatisticsReport(requestData);
		res.status(200).json({ status_code: 200, success: true, message: 'Criteo Account Report fetched successfully.', data: criteoAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Criteo Account Report.', data: error });
	}
}

export const fetchBingAccounts = async (req, res) => {
	try {
		const bingLib = new BingService();
		const bingAccountList = await bingLib.getAllAccounts();
		res.status(200).json({ status_code: 200, success: true, message: 'Bing Account list fetched successfully.', data: bingAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Bing Account List.', data: error });
	}
}

export const fetchBingReport = async (req, res) => {
	try {
		const bingLib = new BingService();
		const bingAccountList = await bingLib.generateReport(req?.body);
		res.status(200).json({ status_code: 200, success: true, message: 'Bing Account Report fetched successfully.', data: bingAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Bing Account Report.', data: error });
	}
}

export const testRedis = async (req, res) => {
	try {
		const redisValue = await redisClient.get('test');
		await redisClient.set('test', 'Second Hello Redis');
		// if(!redisKey){
		// 	await redisClient.set('test', 'Hello Redis');
		// }
		// else{

		// }

		res.status(200).json({ status_code: 200, success: true, message: 'redis worked successfully.', data: redisValue });
	} catch (error) {
		logger.error(error, 'error:');
	}
}

export const findStore = async (req, res) => {
	try {
		const store = await clientDetails.find({ _id: '69415889982c42d4df947fe9' });
		res.status(200).json({ status_code: 200, success: true, message: 'store fetched successfully.', data: store });
	} catch (error) {
		logger.error(error, 'error:');
	}
}

export const mondayTest = async (req, res) => {
	try {
		const monday = new MondayService();
		const response = await monday.mondayClientList();
		res.status(200).json({ status_code: 200, success: true, message: 'Monday API fetched successfully.', data: response });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in Monday API.', data: error });
	}
}

export const prepareBulkData = async (req, res) => {
	try {
		const clientId = req.query.clientid;
		const network = req.query.network;
		const modelName = getCentralStorageModel(`central_storage_2025`);
		const metaData = await modelName.find({ client_id: clientId }).lean();
		// console.log('metaData==>',metaData)
		var ops: any[] = [];
		for (let index = 1; index < 15000000; index++) {
			const newData = metaData.map(({ _id, ...item }) => ({
				...item,
				// network: network,
				client_id: generateId()
			}));

			ops = newData.map(item => ({
				updateOne: {
					filter: {
						client_id: item.client_id,
						network: network,
						date: item.date,
					},
					update: {
						$set: item,
						$setOnInsert: {
							createdAt: new Date()
						}
					},
					upsert: true
				}
			}));
			await modelName.bulkWrite(ops, { ordered: false });
		}
		res.status(200).json({ status_code: 200, success: true, message: 'Bulk data inserted successfully.', data: [] });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in data insertion.', data: error });
	}
}
function generateId() {
	return new ObjectId().toString();
}

export const testQuery = async (req, res) => {
	try {
		// const redisValue = await redisClient.get('dbData');
		// var dataList = [];
		// if(!redisValue){
		// 	const {clientId,network,startDate,endDate}=req?.body;
		// 	const modelName = getCentralStorageModel(`central_storage_2025`);
		// 	dataList  = await modelName.find({
		// 						client_id: clientId,
		// 						date: {
		// 							$gte: startDate,
		// 							$lte: endDate
		// 						}
		// 					}).lean();
		// 	await redisClient.set('dbData', JSON.stringify(dataList));
		// }else{
		// 	dataList = redisValue;
		// }
		const { clientId, network, startDate, endDate } = req?.body;
		const modelName = getCentralStorageModel(`central_storage_2025`);
		const dataList = await modelName.find({
			client_id: clientId,
			date: {
				$gte: startDate,
				$lte: endDate
			}
		}).lean();
		res.status(200).json({ status_code: 200, success: true, message: 'Query fetched successfully.', data: dataList });
	} catch (error) {
		logger.error(error, 'error:');
	}
}

export const metaNewAds = async (req, res) => {
	try {
		const meta = new MetaService();
		const newAdsList = await meta.getMetaAdData(req.body);
		// const newAdsList = await meta.fetchNewAds(req.body);
		// console.log('newAdsList==>',newAdsList);
		res.status(200).json({ status_code: 200, success: true, message: 'New Ads fetched successfully.', data: newAdsList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving new Ads.', data: error });
	}
}

export const shopifyPerformanceReport = async (req, res) => {
	try {
		const requestData = {
			storeUrl: req?.body?.storeUrl,
			accessToken: req?.body?.accessToken,
			startDate: req?.body?.startDate,
			endDate: req?.body?.endDate,
			clientId: req?.body?.clientId,
			connectionId: req?.body?.connectionId
		};

		const shopify = new ShopifyService();
		const performanceResponse = await shopify.PerformanceReport(requestData);

		res.status(200).json({
			status_code: 200,
			success: true,
			message: "Shopify Performance Data fetched successfully",
			data: performanceResponse
		});
	} catch (error) {
		res.status(422).json({
			status_code: 422,
			success: false,
			message: "Error in fetching Shopify Performance data",
			data: error
		});
	}
};



export const testRefreshToken = async (req, res) => {
	console.log('cookies==>', req.headers);
	const refreshToken = req.headers.cookie;
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
	//  res.clearCookie("refreshToken");
	res.status(200).json({ status_code: 200, success: true, message: 'Testing refresh token successfully.', data: req.body });
}

export const klaviyoTest = async (req, res) => {
	try {
		const klaviyoLib = new klaviyoService(req.body.accountkey);
		// const klaviyyo   = await klaviyoLib.getMetrices();
		// const klaviyyo   = await klaviyoLib.getProfiles();
		// const klaviyyo   = await klaviyoLib.getCampaigns(req.body);
		// const klaviyyo   = await klaviyoLib.getFlows();
		// const klaviyyo   = await klaviyoLib.reporting(req.body);
		// const klaviyyo   = await klaviyoLib.flowReporting(req.body);
		const klaviyyo   = await klaviyoLib.fetchKlaviyoRecords(req.body);
		res.status(200).json({ status_code: 200, success: true, message: 'klaviyo triggered successfully.', data: klaviyyo });
	} catch (error) {
		console.log('error==>', error);
		res.status(422).json({ status_code: 422, success: false, message: 'Error in klaviyo.', data: error });
	}
}