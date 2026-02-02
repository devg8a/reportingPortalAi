import axios from "axios";

export async function triggerApi(url,requestData) {
  try{
    const response = await axios(url, {
      method: 'GET',
      headers: { 
          Accept: "application/json",
          Authorization: `Bearer ${requestData?.apiKey}`, 
      },
    });
    console.log('levanta triggerApi==> ',response)
    return {
      headers: response?.headers,
      status: response?.status,
      data: response?.data?.data,
    };
  }catch(error){
    console.log('API call error==>',error);
  }
}