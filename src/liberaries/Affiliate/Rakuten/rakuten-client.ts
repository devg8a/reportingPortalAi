import axios from "axios";

export async function triggerApi(url) {
  const response = await axios(url, {
    method: 'GET',
    headers: { Accept: "application/json" },
  });
  // console.log('Rakuten triggerApi status ==>',response.status)

  return {
    headers : response.headers,
    data    : response.data,
    status  : response.status,
  };
}
