import axios from "axios";

export async function authenticate() {
  try{
    const url  = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const body = new URLSearchParams({
        client_id: process.env.BING_CLIENT_ID,
        refresh_token: process.env.BING_REFRESH_TOKEN,
        grant_type: "refresh_token",
        scope: "https://ads.microsoft.com/msads.manage offline_access"
    });
    
    const response = await axios(url, {
      method: 'POST',
      headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
      },
      data: body,
    });
    // console.log('triggerApi==> ',response.data);
    return response?.data?.access_token;
  }catch(error){
    console.log('API call error==>',error);
  }
}

export async function triggerApi(url,headers,query) {
  try{
    const response = await axios(url, {
      method: 'POST',
      headers: headers,
      data: query,
    });
    // console.log('BING triggerApi==> ',response);
    return {
      headers: response?.headers,
      status: response?.status,
      data: response?.data,
    };
  }catch(error){
    return error?.response;
  }
}