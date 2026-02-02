import axios from "axios";

export async function triggerApi(url: string) {
  try{
    const response = await axios(url, {
      method: 'GET',
      headers: { 
          Accept: "application/json",
      },
    });
    // console.log('Avantlink triggerApi==> ',response);
    return {
      headers : response?.headers,
      status  : response?.status,
      data    : response?.data,
    };
  }catch(error){
    console.log('Avantlink API call error==>',error);
  }
}