import axios from "axios";

export async function triggerApi(url: string, authToken: string) {
  try{
    const response = await axios(url, {
      method: 'GET',
      headers: { 
          Accept: "application/json",
          Authorization: `Basic ${authToken}`, 
      },
    });
    // console.log('impact triggerApi==> ',response);
    return {
      headers : response?.headers,
      status  : response?.status,
      data    : response?.data,
    };
  }catch(error){
    // console.log('impact triggerApi Error==> ',error);
    throw error?.response?.data;
  }
}