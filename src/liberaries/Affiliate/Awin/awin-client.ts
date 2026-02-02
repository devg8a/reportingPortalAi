import axios from "axios";

interface AwinRequestData {
  authToken: string;
}

export async function triggerApi(url: string, requestData: AwinRequestData) {
  try{
    const response = await axios(url, {
      method: 'GET',
      headers: { 
          Accept: "application/json",
          Authorization: `Bearer ${requestData?.authToken}`, 
      },
    });
    // console.log('Awin triggerApi==> ',response);
    return {
      headers : response?.headers,
      status  : response?.status,
      data    : response?.data,
    };
  }catch(error){
    console.log('API call error==>',error);
    throw error;
  }
}