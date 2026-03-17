import clientConnections from "../../../db/models/clientConnections";
import clientDetails from "../../../db/models/clientDetails";

export function storeDetailParameters() {
  const query = `query { 
                    shop { 
                        id
                        name,
                        myshopifyDomain 
                    }
                  }`;
  return query;
}

export async function salesParameters(data) {
  const timeUnit = data?.granularity === 'hourly' ? 'hour' : 'day';
  ;

  const exludedQuery = await getExcludedSalesChannelsQuery(data.connectionId);
  const query = `query {
                  shopifyqlQuery(query: "FROM sales SHOW 
                      gross_sales, 
                      discounts, 
                      shipping_charges, 
                      taxes, 
                      returns, 
                      net_sales, 
                      total_sales, 
                      orders, 
                      quantity_ordered
                      ${exludedQuery} 
                      TIMESERIES ${timeUnit}
                      WITH CURRENCY 'USD' 
                      ORDER BY ${timeUnit} ASC
                      SINCE ${data?.startDate} UNTIL ${data?.endDate}") {
                      tableData {
                          rows
                      }
                      parseErrors
                  }
              }`;
  return query;
}


async function getExcludedSalesChannelsQuery(connectionId) {
  const data = await clientConnections.findById(connectionId);
  const shopifyFilter = data?.filter;
  if (!shopifyFilter?.length) return '';
  return `WHERE ${shopifyFilter.map(filterVal => `${filterVal?.field} ${filterVal?.operator} '${filterVal?.value}'`).join(' AND ')}`;
}



export async function PerformanceParameters(data) {


  const exludedQuery = await getExcludedSalesChannelsQuery(data.connectionId);
  const query = `query {
  shopifyqlQuery(query: "FROM sales 
        SHOW 
          gross_sales, 
          discounts, 
          shipping_charges, 
          taxes, 
          returns, 
          net_sales, 
          total_sales 
        WHERE line_type = 'product' 
          AND product_id != 0 
          AND order_tags NOT CONTAINS 'Amazon-US'
          AND sales_channel NOT CONTAINS 'pos'
          AND sales_channel NOT CONTAINS 'point of sale'
          ${exludedQuery}
        GROUP BY product_title, day
        TIMESERIES day
        WITH CURRENCY 'USD'
        ORDER BY day ASC
        SINCE ${data?.startDate} UNTIL ${data?.endDate}
        LIMIT 100000 OFFSET 0"
  ) {
    tableData {
      rows
    }
    parseErrors
  }
}
`;
  // console.log(query, "query")
  return query;
}




export function sessionParameters(data) {
  const timeUnit = data?.granularity === 'hourly' ? 'hour' : 'day';

  const query = `query {
                    shopifyqlQuery(query: "FROM sessions, sales SHOW 
                        sessions, 
                        customers, 
                        new_customers, 
                        online_store_visitors,
                        conversion_rate
                        TIMESERIES ${timeUnit}
                        ORDER BY ${timeUnit} ASC
                        SINCE ${data?.startDate} UNTIL ${data?.endDate}") {
                        tableData {
                            rows
                        }
                        parseErrors
                    }
                }`;
  return query;
}

export function buildDaywiseMetrics(salesReportDataList: any[] = [], sessionReportDataList: any[] = [], granularity: 'daily' | 'hourly' = 'daily') {
  if (!salesReportDataList.length && !sessionReportDataList.length) {
    return {};
  }

  const result: Record<string, any> = {};
  const timeKey = granularity === 'hourly' ? 'hour' : 'day';

  // Merge sales data
  for (const item of salesReportDataList) {
    const timeValue = item[timeKey];
    if (!timeValue) continue;

    const { hour, day, ...rest } = item; // Remove both hour and day from rest
    result[timeValue] = {
      ...(result[timeValue] || {}),
      ...rest
    };
  }

  // Merge session data
  for (const item of sessionReportDataList) {
    const timeValue = item[timeKey];
    if (!timeValue) continue;

    const { hour, day, ...rest } = item; // Remove both hour and day from rest
    result[timeValue] = {
      ...(result[timeValue] || {}),
      ...rest
    };
  }

  // Normalize & format values
  const finalResult: Record<string, any> = {};
  for (const timeValue of Object.keys(result)) {
    const data = result[timeValue];

    finalResult[timeValue] = {
      date: timeValue,
      gross_sales: to2Decimal(data?.gross_sales ?? 0),
      discounts: to2Decimal(data?.discounts ?? 0),
      returns: to2Decimal(data?.returns ?? 0),
      net_sales: to2Decimal(data?.net_sales ?? 0),
      shipping_charges: to2Decimal(data?.shipping_charges ?? 0),
      taxes: to2Decimal(data?.taxes ?? 0),
      total_sales: to2Decimal(data?.total_sales ?? 0),
      // revenue: to2Decimal(data?.total_sales ?? 0), // Add revenue field from total_sales
      quantity_ordered: Number(data?.quantity_ordered ?? 0),
      orders: Number(data?.orders ?? 0),
      sessions: Number(data?.sessions ?? 0),
      customers: Number(data?.customers ?? 0),
      new_customers: Number(data?.new_customers ?? 0),
      online_store_visitors: Number(data?.online_store_visitors ?? 0),
      conversion_rate: to2Decimal(data?.conversion_rate ?? 0),
    };
  }

  return finalResult;
}



const to2Decimal = (value: any): number =>
  Number(Number(value ?? 0).toFixed(2));