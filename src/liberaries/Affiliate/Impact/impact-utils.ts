import dayjs from "dayjs";

export function generateToken(account_id,auth_token){
	const combined_token  = account_id+':'+auth_token;
	const encrypted_token = Buffer.from(combined_token).toString("base64");
	return encrypted_token;
}

export function prepareTransactionApiUrl(data){
	/**Bark Phone: action value = 41191,32647
	 * Chaiz : action value = 47627
	 * otherwise : action value = 0
	 **/
	const actionvalue = '0';
	// const additionalSuperstatus = clientName=='Bark phone'? '&SUPERSTATUS_MS=NA' : '';
	const url = `https://api.impact.com/Advertisers/${data.accountId}`+
					    `/ReportExport/adv_action_listing_pm_only?START_DATE=${data.startDate}`+
						`&END_DATE=${data.endDate}&SUBAID=${data.programId}&SHOW_AD=1&SHOW_DATE=1`+
						`&SHOW_LANDING_PAGE=1&SHOW_GROUP=1&SUPERSTATUS_MS=APPROVED&SUPERSTATUS_MS=PENDING&ACTION_NAME=${actionvalue}`+
						`&ADV_AFFILIATE_MEDIA_SOURCE=0&ACTION_TYPE=0&PERFORMANCE_CAMPAIGN_STATUS=0&CREATOR=0&PARTNER_RADIUS_SOLR=0&SOCIAL_POST_TYPE=0&SOCIAL_PLATFORM=0&CREATOR_CAMPAIGN=0&DEAL_NAME=0&ACTION_ID=0&OID_ALL=0&MS_MP_GROUP=0&RELATIONSHIP_TYPE=0&SHAREDID=0&ADV_IO=0&REFERRAL_TYPE=0&ADV_CUSTOMER_STATUS=0&CUSTOMER_ID=0&ADV_PROMOCODE=0&ADV_CATEGORY_2=0&AD_TYPE2=0&CAM_AD_2=0&IS_CROSS_CAMPAIGN=0&CONV_CURRENCY=USD&timeRange=CUSTOM&queryIndex=0&start=0&ResultFormat=JSON&limit=1000`;

	return url;
}

export function preparePublisherListApiUrl(data){
	// const startDate = dayjs().subtract(2, "year").format('YYYY-MM-DD T00:00:00Z');
	const startDate = dayjs().subtract(10, "day").format('YYYY-MM-DD T00:00:00Z');
	const endDate 	= dayjs().subtract(1, "day").format('YYYY-MM-DD T23:59:59Z');

	const url = `https://api.impact.com/Advertisers/${data.accountId}`+
			    `/ReportExport/adv_db_new_mps_groups?START_DATE=${startDate}`+
				`&END_DATE=${endDate}&SUBAID=${data.programId}&ResultFormat=JSON`;
	return url;
}