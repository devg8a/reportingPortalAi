import dayjs from "dayjs";

export function preparePublisherListApiUrl(data){
    const url = `https://classic.avantlink.com/api.php?module=MerchantReport&`+
                `auth_key=${data?.authKey}&merchant_id=${data?.accountId}&merchant_parent_id=0&affiliate_id=0&website_id=0`+
                `&date_begin=${data?.startDate}&date_end=${data?.endDate}&affiliate_group_id=0&report_id=20&output=json`;
    return url;
}

export function prepareTransactionListApiUrl(data){
    const url = `https://classic.avantlink.com/api.php?module=MerchantReport&`+
                `auth_key=${data?.authKey}&merchant_id=${data?.accountId}&merchant_parent_id=0&affiliate_id=0&website_id=0`+
                `&date_begin=${data?.startDate}&date_end=${data?.endDate}&affiliate_group_id=0&report_id=8&output=json`;
    return url;
}

export function sanitizePublishersListResponse(rawDataList){
    const allDataList = rawDataList.reduce((publisherData, rawData) => {
                            const publisher_id = rawData["Affiliate Id"];

                            publisherData[publisher_id] = {
                                publisher_id:publisher_id,
                                cpc_fees: rawData["CPC Fees"],
                                network_cpc_fees: rawData["Network CPC Fees"],
                                placement_fees: rawData["Placement Fees"],
                                network_placement_fees: rawData["Network Placement Fees"],
                                website_id: rawData["Website Id"],
                                affiliate_website_name: rawData["Affiliate Website Name"],
                                affiliate_website: rawData["Affiliate Website"],
                                website_category: rawData["Website Category"],
                                affiliate_category: rawData["Affiliate Category"],
                                ad_impressions: rawData["Ad Impressions"],
                                click_throughs: rawData["Click Throughs"],
                                sales: rawData["Sales"],
                                no_of_sales: rawData["# of Sales"],
                                no_of_mobile_sales: rawData["# of Mobile Sales"],
                                mobile_sales: rawData["Mobile Sales"],
                                no_of_adjustments: rawData["# of Adjustments"],
                                new_customers: rawData["New Customers"],
                                new_customers_sales: rawData["New Customer Sales"],
                                commissions: rawData["Commissions"],
                                incentives: rawData["Incentives"],
                                network_commissions: rawData["Network Commissions"],
                                total_commissions_fees: rawData["Total Commissions/Fees"],
                                conversion_rate: rawData["Conversion Rate"],
                                new_customer_percentage: rawData["New Customer %"],
                                click_through_rate: rawData["Click Through Rate"],
                                affiliate_tags: rawData["Affiliate Tags"],
                            };
                            
                            return publisherData;
                            }, {});
    return allDataList;
}

export function sanitizeTransactionListResponse(rawDataList){
    const allDataList = rawDataList.reduce((transactionData, item) => {
					const transactionDate = dayjs(item['Transaction Date']).format('YYYY-MM-DD');

					if (!transactionData[transactionDate]) {
					   transactionData[transactionDate] = [];
					}

					transactionData[transactionDate].push({
                        merchant_id: item['Merchant Id'],
                        merchant: item['Merchant'],
                        affiliate_id: item['Affiliate Id'],
                        website_id: item['Website Id'],
                        website: item['Website'],
                        transaction_amount: item['Transaction Amount'],
                        order_id:item['Order Id'],
                        transaction_date:item['Transaction Date'],
                        tool_name:item['Tool Name'],
                        campaign_product_link: item['Campaign/Product Link'],
                        custom_tracking_code: item['Custom Tracking Code'],
                        transaction_type: item['Transaction Type'],
                        base_commission:item['Base Commission'],
                        incentive_commission: item['Incentive Commission'],
                        total_commission: item['Total Commission'],
                        network_commission: item['Network Commission'],
                        avantLink_transaction_id:item['AvantLink Transaction Id'],
                        last_click_through: item['Last Click Through'],
                        mobile_order:item['Mobile Order'],
                        item_count:item['Item Count'],
                        new_customer:item['New Customer'],
                        coupon_code:item['Coupon Code'],
                        payment_id:item['Payment Id'],
                        commission_status:item['Commission Status'],
                        sub_affiliate_domain:item['Sub Affiliate Domain'],
                        affiliate_business_classifications:item['Affiliate Business Classifications'],
                        affiliate_tags: item['Affiliate Tags']
                    });

					return transactionData;
					}, {});
    return allDataList;
}