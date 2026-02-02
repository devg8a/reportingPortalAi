import axios from "axios";

export async function triggerApi(url, accessToken, query) {
  try {
    const response = await axios(url, {
      method: 'POST',
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query: query,
      },
    });
    // console.log('SHOPIFY triggerApi==> ', response?.data?.data?.shopifyqlQuery?.tableData?.rows);
    return {
      headers: response?.headers,
      status: response?.status,
      data: response?.data?.data?.shopifyqlQuery?.tableData?.rows,
    };
  } catch (error) {
    console.log('API call error==>', error);
  }
}