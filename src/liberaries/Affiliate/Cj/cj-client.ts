import axios from "axios";

const authToken = '7v0233v3pd5c2tnjasvat9etj7';

export async function triggerApi(url,data) {
  try{
    const query = `query {
        advertiserCommissions(
          forAdvertisers: ["${data.accountId}"],
          actionStatuses: ["new","closed"],
          sinceEventDate: "${data.startDate}T00:00:00Z",
          beforeEventDate: "${data.endDate}T23:59:59Z"
        ) {
          count
          payloadComplete
          records {
            eventDate
            postingDate
            publisherName
            publisherId
            pubCommissionAmountUsd
            saleAmountUsd
            websiteName
            clickReferringURL
            actionTrackerName
            actionType
            clickDate
            actionStatus
            websiteId
          }
        }
      }`;

    const response = await axios(url, {
      method: 'POST',
      headers: { 
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`, 
      },
      data: {
        query: query, 
      },
    });
    
    if(response?.data?.errors){
      return {
        headers : response?.headers,
        status  : 422,
        data    : response?.data?.errors,
      };
    }else{
      return {
        headers : response?.headers,
        status  : response?.status,
        data    : response?.data?.data?.advertiserCommissions?.records,
      };
    }
  }catch(error){
    // console.log('Cj API call error==>',error);
    throw error;
  }
}