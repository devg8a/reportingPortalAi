import axios from "axios";

export async function triggerApi(url) {
  try{
    const response = await axios(url, {
      method: 'GET',
      headers: { Accept: "application/json" },
    });
    // console.log("response==>",response);
    return {
      headers : response.headers,
      data    : response.data,
      status  : response.status,
    };
  }catch(error){
    // console.log("error==>",error);
    throw error?.response;
  }
}
