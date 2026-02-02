import { generateToken, prepareTransactionApiUrl, preparePublisherListApiUrl } from './impact-utils';
import * as apiClient from './impact-client';
/**
 * API Documentation: https://integrations.impact.com/impact-agency 
 * 
 **/
export class ImpactService {

	async accountInfo(requestData){
		try{
			const authToken = generateToken(requestData?.accountId,requestData?.authToken);
			const url  		= `https://api.impact.com/Advertisers/${requestData?.accountId}`;
			const response  = await apiClient.triggerApi(url,authToken);
			if (response?.status !== 200) {
		        return response;
		    }else{
	        	return response?.data;
	      	}
		}catch(error){
			console.error("Impact API error: ", error);
	      	throw new Error("Failed to fetch Account Info.");
		}
	}

	async publisherList(requestData){
		try{
			const authToken = generateToken(requestData?.accountId,requestData?.authToken);
			const url  		= preparePublisherListApiUrl(requestData);
			const response = await apiClient.triggerApi(url,authToken);
			if (response?.status !== 200) {
		        return response;
		    }else{
		    	console.log('response==>',response);
	        	return response?.data;
	      	}
		}catch(error){
			console.error("Impact API error: ", error);
	      	throw new Error("Failed to fetch Account Info.");
		}
	}
	
	async transactionList(requestData){
		try{
			const authToken = generateToken(requestData?.accountId,requestData?.authToken);
			const url  		= prepareTransactionApiUrl(requestData);
			const response  = await apiClient.triggerApi(url,authToken);
			if (response?.status !== 200) {
		        return response;
		    }else{
		    	console.log('response==>',response);
	        	return response?.data;
	      	}
		}catch(error){
			console.error("Impact API error: ", error);
	      	throw new Error("Failed to fetch Account Info.");
		}
	}


}