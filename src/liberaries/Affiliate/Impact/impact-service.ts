import { generateToken,
		prepareTransactionApiUrl,
		preparePublisherListApiUrl,
		groupDayWiseTransactionData } from './impact-utils';
import * as apiClient from './impact-client';
import { captureToCentralStorage } from '../../../db/schema/capture-central-storage';
import ErrorLogs from "../../../db/models/errorLogs";
import impactJobs from "../../../db/models/impactJobs";
import logger from '../../../utils/logger';
import ImpactJobs from '../../../db/models/impactJobs';

/**
 * API Documentation: https://integrations.impact.com/impact-agency 
 * 
 **/
export class ImpactService {

	async accountInfo(requestData) {
		try {
			const authToken = generateToken(
				requestData?.accountId,
				requestData?.authToken
			);

			const url = `https://api.impact.com/Advertisers/${requestData?.accountId}`;
			const response = await apiClient.triggerApi(url, authToken);

			if (response?.status !== 200) {
				return {
					status_code: response?.status || 401,
					success: false,
					message: "Failed to fetch Impact account info",
					data: null
				};
			}else{
				return {
					status_code: response?.status,
					success: false,
					message: "Error in Impact account Info.",
					data: response?.data
				};
			}

		} catch (error) {
			throw error;
		}
	}

	async publisherList(requestData) {
		try {
			const authToken = generateToken(requestData?.accountId, requestData?.authToken);
			const url = preparePublisherListApiUrl(requestData);
			const response = await apiClient.triggerApi(url, authToken);
			if (response?.status !== 200) {
				return response;
			} else {
				console.log('response==>', response);
				return response?.data;
			}
		} catch (error) {
			console.error("Impact API error: ", error);
			throw new Error("Failed to fetch Account Info.");
		}
	}

	async transactionList(requestData) {
		try {
			const authToken = generateToken(requestData?.accountId, requestData?.authToken);
			const url 		= prepareTransactionApiUrl(requestData);
			const response = await apiClient.triggerApi(url, authToken);
			if (response?.status !== 200) {
				return response;
			} else {
				if(process.env.NODE_ENV == 'production'){
					const jobId = this.getJobId(response?.data?.QueuedUri);
					if(jobId){
						await impactJobs.insertOne({
							client_id	  : requestData?.clientId,
							connection_id : requestData?.connectionId,
							job_id        : jobId,
							type          : "transaction",
							status        : "pending",
							url           :  response?.data?.ResultUri
						});
						await new Promise(resolve => setTimeout(resolve, 2000));
						await this.checkforWebhookCompletion(jobId);
					}
				}
				
				const reportResponse = await this.reportDownload(response?.data, authToken);
				if(reportResponse?.length){
					const structuredTransactionData = await groupDayWiseTransactionData(reportResponse);
					await captureToCentralStorage(structuredTransactionData, requestData?.clientId, requestData?.connectionId, 'impact');
					return structuredTransactionData;
				}else{
					return [];
				}
				
			}
		} catch (error) {
			await ErrorLogs.insertOne({
				client_id	  : requestData?.clientId,
				connection_id : requestData?.connectionId,
				network	  	  : "impact",
				start_date	  : requestData?.startDate,
				end_date  	  : requestData?.endDate,
				error	  	  : error,
			});
			logger.info(error,"Impact Error:");
			throw error;
		}
	}

	async reportDownload(reportData, authToken) {
		try{
			const reportStatus = await this.fetchReportStatus(reportData?.QueuedUri, authToken);
			// console.log("reportStatus==>",reportStatus);
			if(reportStatus?.status == "COMPLETED" && reportStatus?.downloadUrl != null){
				const url = `https://api.impact.com${reportStatus.downloadUrl}`;
				const response = await apiClient.triggerApi(url, authToken);
				if(response.status == 200){
					return response?.data?.Records;
				}
			}
		}catch(error){
			console.log("Impact Report Download Error",error);
			throw error;
		}
	}

	async fetchReportStatus(reportUrl,authToken){
		try{
			const url = `https://api.impact.com${reportUrl}`;
			const response = await apiClient.triggerApi(url, authToken);
			// console.log("fetchReportStatus response==>",response);
			if(response?.data?.Status == 'COMPLETED'){
				return { status:response?.data?.Status, downloadUrl:response?.data?.ResultUri};
			}else if (response?.data?.Status === 'FAILED') {
				throw new Error("Impact report failed");
			}else{
				await new Promise(resolve => setTimeout(resolve, 5000));
				return await this.fetchReportStatus(reportUrl,authToken);
			}
			// if(response?.data?.Status == 'RUNNING' || response?.data?.Status == 'QUEUED'){
			// 	new Promise(resolve => setTimeout(resolve, 2000));
			// 	this.fetchReportStatus(reportUrl,authToken);
			// }
		}catch(error){
			console.log("Impact Report Status Error",error);
			throw error;
		}
	}

	getJobId(url: string) {
		const match = url.match(/Jobs\/([a-z0-9-]+)/i);
		return match?.[1] || null;
	}

	async checkforWebhookCompletion(jobId, retries = 20, delay = 2000) {
		for (let i = 0; i < retries; i++) {
			const activity = await ImpactJobs
				.findOne({ job_id: jobId })
				.select("status")
				.lean();
			// console.log("activity?.status==>",activity?.status);
			if (activity?.status === "completed") {
				await ImpactJobs.deleteOne({ job_id: jobId });
				return { status: "completed" };
			}

			if (activity?.status === "error") {
				return { status: "error" };
			}
			// wait before next check
			await new Promise(res => setTimeout(res, delay));
		}
		return { status: "timeout" };
	}
}