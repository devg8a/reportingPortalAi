import axios from "axios";

export async function triggerShopDetailApi(url, accessToken, query) {
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
    // console.log('SHOPIFY triggerApi==> ', response);
    return {
      headers: response?.headers,
      status: response?.status,
      data: response?.data?.data?.shop,
    };
  } catch (error) {
    throw error?.response;
  }
}

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
    // console.log('SHOPIFY triggerApi==> ', response);
    return {
      headers: response?.headers,
      status: response?.status,
      data: response?.data?.data?.shopifyqlQuery?.tableData?.rows,
    };
  } catch (error) {
    throw error?.response;
  }
}