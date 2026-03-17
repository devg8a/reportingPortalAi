import ClientIcp from "../db/models/clientIcp";
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
import PerformanceClientDetail from "../db/models/performanceClientDetail";
import schedularLogs from "../db/models/schedularLogs";
import { redisConnection } from "../config/redis";
import { ImpactService } from "../liberaries/Affiliate/Impact/impact-service";
import { RakutenService } from "../liberaries/Affiliate/Rakuten/rakuten-service";
import { PepperjamService } from "../liberaries/Affiliate/Pepperjam/pepperjam-service";
import { AwinService } from "../liberaries/Affiliate/Awin/awin-service";
import { AvantlinkService } from "../liberaries/Affiliate/Avantlink/avantlink-service";
import { CjService } from "../liberaries/Affiliate/Cj/cj-service";
import { LevantaService } from "../liberaries/Affiliate/Levanta/levanta-service";
import { HubspotService } from "../liberaries/Hubspot/HubspotLib";

export const affiliateNetworkTestingApi = async (req, res) => {
	try {
		const networkHandlers: Record<string, (data: any) => Promise<any>> = {
			rakuten: (data) => {
				return new RakutenService().transactionList(data);
			},
			impact: (data) => {
				return new ImpactService().transactionList(data);
			},
			awin: (data) => {
				return new AwinService().transactionList(data);
			},
			avantlink: (data) => {
				return new AvantlinkService().transactionList(data);
			},
			cj: (data) => {
				return new CjService().transactionList(data);
			},
			levanta: (data) => {
				return new LevantaService().transactionList(data);
			},
			pepperjam: (data) => {
				return new PepperjamService().transactionList(data);
			}
		};
		const response = await networkHandlers[req?.body?.network](req.body);
		res.status(200).json({ status_code: 200, success: true, message: 'Affiliate Network data fetched successfull', data: response });
	} catch (error) {
		// logger.info(error,"Affiliate API Error: ");
		res.status(422).json({ status_code: 422, success: false, message: 'Error in Affiliate Network', data: error });
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
			connectionId: req?.body?.connectionId
		}
		const analytics = new analyticsDataService();
		const ga4DataList = await analytics.fetchAnalyticsReport(requestData);
		// console.log(ga4DataList, "ga4DataList")
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
		// const shopifyResponse = await shopify.storeDetailsApi(requestData);
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
			granularity: req?.body?.granularity,
			connectionId: req?.body?.connectionId,
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
			clientId: req.body.clientId,
			connectionId: req.body.connectionId,
		}
		const adwordLib = new AdwordService();
		const adwordAccountData = await adwordLib.adwordReport(requestData);
		// const adwordAccountData = await adwordLib.performanceReport(requestData);
		// console.log('adwordAccountData==>', adwordAccountData);
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
			clientId: req.body.clientId,
			accountId: req.body.accountId,
			startDate: req.body.startDate,
			endDate: req.body.endDate,
			connectionId: req.body.connectionId,
		}
		const criteoLib = new CriteoService();
		const criteoAccountList = await criteoLib.getStatisticsReport(requestData);
		res.status(200).json({ status_code: 200, success: true, message: 'Criteo Account Report fetched successfully.', data: criteoAccountList });
	} catch (error) {
		res.status(422).json({ status_code: 422, success: false, message: 'Error in retreiving Criteo Account Report.', data: error?.stack });
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
		// const response = await monday.mondayClientList();
		// const response = await monday.updateMondayBoard();
		const response = await monday.getBoards([4148302055]);
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
		const klaviyoLib = new klaviyoService();
		// const klaviyyo   = await klaviyoLib.getMetrices();
		// const klaviyyo   = await klaviyoLib.getProfiles();
		// const klaviyyo   = await klaviyoLib.getCampaigns(req.body);
		// const klaviyyo   = await klaviyoLib.getFlows();
		// const klaviyyo   = await klaviyoLib.reporting(req.body);
		// const klaviyyo   = await klaviyoLib.flowReporting(req.body);
		const klaviyyo = await klaviyoLib.fetchKlaviyoRecords(req.body);
		res.status(200).json({ status_code: 200, success: true, message: 'klaviyo triggered successfully.', data: klaviyyo });
	} catch (error) {
		console.log('error==>', error);
		res.status(422).json({ status_code: 422, success: false, message: 'Error in klaviyo.', data: error });
	}
}



import { Request, Response } from "express";
import clientConnections from "../db/models/clientConnections";
import AccountSummary from "../db/models/AccountSummary";
import moment from "moment";
import { populate } from "dotenv";
import { testTemplate } from '../emailTemplates/test';
import { triggerEmailNotification } from '../services/emailService';

export const getPerformanceRevenue = async (req: Request, res: Response) => {
	try {

		const { clientId, startDate, endDate } = req.body;

		const startMonth = startDate.slice(0, 7);
		const endMonth = endDate.slice(0, 7);

		const reports = await PerformanceClientDetail.find({
			client_id: clientId,
			year_month: { $gte: startMonth, $lte: endMonth }
		}).lean();

		// ✅ Generic extractor
		const extractMetric = (obj: any, metricKey: string): number => {
			let sum = 0;

			if (!obj || typeof obj !== "object") return 0;

			for (const key in obj) {
				if (key === metricKey && typeof obj[key] === "number") {
					sum += obj[key];
				} else if (typeof obj[key] === "object") {
					sum += extractMetric(obj[key], metricKey);
				}
			}

			return sum;
		};

		let metaRevenue = 0;
		let adwordRevenue = 0;
		let shopifyRevenue = 0;

		let metaSpend = 0;
		let adwordSpend = 0;

		reports.forEach((report) => {

			const data = report?.data || {};

			// META
			Object.entries(data.meta_response || {}).forEach(([date, val]: any) => {
				if (date >= startDate && date <= endDate) {
					metaRevenue += extractMetric(val, "revenue");
					metaSpend += extractMetric(val, "spend");
				}
			});

			// ADWORD
			Object.entries(data.adword_response || {}).forEach(([date, val]: any) => {
				if (date >= startDate && date <= endDate) {
					adwordRevenue += extractMetric(val, "revenue");
					adwordSpend += extractMetric(val, "spend");
				}
			});

			// SHOPIFY
			Object.entries(data.shopify_response || {}).forEach(([date, val]: any) => {
				if (date >= startDate && date <= endDate) {
					shopifyRevenue += extractMetric(val, "revenue");
				}
			});

		});

		// ✅ ROAS Calculations
		const metaRoas = metaSpend ? metaRevenue / metaSpend : 0;
		const adwordRoas = adwordSpend ? adwordRevenue / adwordSpend : 0;
		const shopifyRoas =
			(metaSpend + adwordSpend)
				? shopifyRevenue / (metaSpend + adwordSpend)
				: 0;

		return res.status(200).json({
			status_code: 200,
			success: true,
			message: "Revenue fetched successfully",
			data: {
				metaRevenue,
				adwordRevenue,
				shopifyRevenue,

				metaSpend,
				adwordSpend,
				totalSpend: metaSpend + adwordSpend,

				metaRoas,
				adwordRoas,
				shopifyRoas,

				totalRevenue: metaRevenue + adwordRevenue + shopifyRevenue
			}
		});

	} catch (error) {

		console.log("Revenue Error =>", error);

		return res.status(422).json({
			status_code: 422,
			success: false,
			message: "Error fetching revenue",
			data: error
		});

	}
};

export const fetchSchedularLogs = async (req, res) => {
	try {
		const logs = await schedularLogs.find();
		res.status(200).json({ status_code: 200, success: true, message: 'Schedular logs fetched successfully.', data: logs });
	} catch (error) {
		return res.status(422).json({ status_code: 422, success: false, message: "Error fetching Schedular", data: error });
	}
}

export const testingShopifyRevenueApi = async (req, res) => {
	try {

		const now = moment();

		// ===== Account Summary (Date Only) =====
		const todayDate = now.format("YYYY-MM-DD");
		const prevTodayDate = now.clone().subtract(1, "day").format("YYYY-MM-DD");

		// ===== Central Storage Base =====
		const yesterdayStart = now.clone().subtract(1, "day").startOf("day");
		const yesterdayEnd = now.clone().subtract(1, "day").endOf("day");

		const dayBeforeStart = now.clone().subtract(2, "day").startOf("day");
		const dayBeforeEnd = now.clone().subtract(2, "day").endOf("day");

		// ===== LAST 7 =====
		const last7Start = now.clone().subtract(7, "day").startOf("day");
		const last7End = yesterdayEnd;

		// ===== PREV 7 =====
		const prev7Start = now.clone().subtract(14, "day").startOf("day");
		const prev7End = now.clone().subtract(8, "day").endOf("day");

		// ===== LAST 30 =====
		const last30Start = now.clone().subtract(30, "day").startOf("day");
		const last30End = yesterdayEnd;

		// ===== PREV 30 =====
		const prev30Start = now.clone().subtract(60, "day").startOf("day");
		const prev30End = now.clone().subtract(31, "day").endOf("day");

		// ===== Clients =====
		const clients = await clientDetails.find({ status: "active" }).lean();

		const centralModel = getCentralStorageModel("central_storage_2025");


		const test = await centralModel.findOne({ network: "shopify" });
		console.log("Sample Date:", test?.date);

		// ===== Number Normalizer =====
		const toNumber = (val: any): number => {
			const num = Number(val);
			return isNaN(num) ? 0 : num;
		};

		// ===== Shopify Revenue Formula =====
		const calcRevenue = (data) => {
			if (!data) return 0;

			const gross = Math.abs(data?.gross_sales);
			const disc = Math.abs(data?.discounts);
			const tax = Math.abs(data?.taxes);
			const shipping = Math.abs(data?.shipping_charges);

			return gross - disc + tax + shipping;
		};

		// ===== Account Summary Revenue =====
		const getAccountSummaryRevenue = async (clientId, date) => {

			const rows = await AccountSummary.find({
				client_id: clientId,
				date: date
			}).lean();

			console.log(rows, "Account Summary Rows");

			let total = 0;

			rows.forEach(row => {
				total += calcRevenue(row?.raw?.shopify);
			});

			console.log(total, "Account Summary Revenue");

			return total;
		};

		// ===== Central Storage Revenue =====
		const getCentralRevenue = async (clientId, start, end) => {

			const rows = await centralModel.find({
				client_id: clientId.toString(),
				network: "shopify",
				date: {
					$gte: start.toDate(),
					$lte: end.toDate()
				}
			}).lean();
			// console.log("Rows Count:", rows);

			return rows.reduce((sum, row) => {
				return sum + calcRevenue(row?.data);
			}, 0);
		};


		const finalResult = [];

		for (const client of clients) {

			const shopifyConnection = await clientConnections.findOne({
				client_id: client._id.toString(),
				network: "shopify"
			});

			if (!shopifyConnection) continue;

			// ===== Account Summary =====
			const todayRevenue = await getAccountSummaryRevenue(client._id, todayDate);
			const prevTodayRevenue = await getAccountSummaryRevenue(client._id, prevTodayDate);

			// ===== Central Storage =====
			const yesterdayRevenue = await getCentralRevenue(client._id, yesterdayStart, yesterdayEnd);
			const dayBeforeRevenue = await getCentralRevenue(client._id, dayBeforeStart, dayBeforeEnd);

			const last7Revenue = await getCentralRevenue(client._id, last7Start, last7End);
			const prev7Revenue = await getCentralRevenue(client._id, prev7Start, prev7End);

			const last30Revenue = await getCentralRevenue(client._id, last30Start, last30End);
			const prev30Revenue = await getCentralRevenue(client._id, prev30Start, prev30End);


			console.log(todayRevenue, prevTodayRevenue, yesterdayRevenue, dayBeforeRevenue, last7Revenue, prev7Revenue, last30Revenue, prev30Revenue);

			finalResult.push({
				clientId: client._id,
				clientName: client.name,

				todayTillNow: Number(todayRevenue.toFixed(2)),
				prevTodayTillNow: Number(prevTodayRevenue.toFixed(2)),

				yesterdayFullDay: Number(yesterdayRevenue.toFixed(2)),
				dayBeforeYesterday: Number(dayBeforeRevenue.toFixed(2)),

				last7Days: Number(last7Revenue.toFixed(2)),
				prev7Days: Number(prev7Revenue.toFixed(2)),

				last30Days: Number(last30Revenue.toFixed(2)),
				prev30Days: Number(prev30Revenue.toFixed(2))
			});
		}

		return res.status(200).json({
			success: true,
			data: finalResult
		});

	} catch (error) {

		console.log("Testing Shopify Revenue Error =>", error);

		return res.status(500).json({
			success: false,
			error
		});
	}
};

export const printAllRedisData = async (req, res) => {
	let cursor = "0";
	let cacheResult: any = [];
	do {
		const result = await redisConnection.scan(cursor, "MATCH", "*", "COUNT", 100);
		cursor = result[0];
		const keys = result[1];

		for (const key of keys) {
		const type = await redisConnection.type(key);

		let value;

		switch (type) {
			case "string":
			value = await redisConnection.get(key);
			break;
			case "hash":
			value = await redisConnection.hgetall(key);
			break;
			case "list":
			value = await redisConnection.lrange(key, 0, -1);
			break;
			case "set":
			value = await redisConnection.smembers(key);
			break;
			case "zset":
			value = await redisConnection.zrange(key, 0, -1, "WITHSCORES");
			break;
			default:
			value = "Unsupported type";
		}

		cacheResult.push({Key:key, type: type, value:value});
		}

	} while (cursor !== "0");
	return res.status(200).json({ success: true, status_code: 200, message: "Redis cache fetched successfully.", data: cacheResult });
}



export const testEmailNotification = async (req, res) => {
	try {
		const dataRecords = req.body;
		const recepient = "prakash@group8a.com";
		const subject = "Important: (New Portal) Monday Data Sync";
		const content = testTemplate(dataRecords);
		await triggerEmailNotification(recepient, subject, content);
		return res.status(200).json({
			success: true,
			message: "Email sent successfully"
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error
		});
	}
}

export const hubspotTest = async (req, res) => {
	const hubspot = new HubspotService();
	// const contacts = await hubspot.getAllContacts();
	const contacts = await hubspot.fetchAllContactLists();
	return res.status(200).json({ success: true, status_code: 200, message: "hubspot successfully.", data: contacts });
}