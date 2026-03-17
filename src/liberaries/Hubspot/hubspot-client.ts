import axios from "axios";

export async function triggerApi(url) {
  try {
    const response = await axios(url, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      }
    });
    // console.log('Hubspot triggerApi==> ', response);
    return {
      headers: response?.headers,
      status: response?.status,
      data: response?.data?.data?.shopifyqlQuery?.tableData?.rows,
    };
  } catch (error) {
    throw error?.response;
  }
}