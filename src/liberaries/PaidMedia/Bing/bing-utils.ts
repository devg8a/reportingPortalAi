import dayjs from "dayjs";
import axios from "axios";
import unzipper from "unzipper";
import csv from "csv-parser";

export function prepareReportBody(requestData){
    const startDate = dayjs(requestData?.startDate);
    const endDate   = dayjs(requestData?.endDate);
    const body = {
        ReportRequest:{
            ReportName: "Account Performance report",
            ReturnOnlyCompleteData: false,
            Type: "AccountPerformanceReportRequest",
            Aggregation: "Daily",
            Columns: [
                "TimePeriod",
                "Spend",
                "Clicks",
                "Impressions",
                "Conversions",
                "Revenue"
            ],
            Scope: {
                "AccountIds": [
                    requestData?.accountId
                ]
            },
            Time: {
                CustomDateRangeStart: {
                    Day   : startDate.date(),
                    Month : startDate.month() + 1,
                    Year  : startDate.year()
                },
                CustomDateRangeEnd: {
                    Day   : endDate.date(),
                    Month : endDate.month() + 1,
                    Year  : endDate.year()
                }
            }
        }
    }
    return body;
}

export async function getBingReportRows(downloadUrl: string) {
  const rows: any[] = [];

  const response = await axios.get(downloadUrl, {
    responseType: "stream"
  });

  await new Promise<void>((resolve, reject) => {
    response.data
      .pipe(unzipper.Parse())
      .on("entry", (entry) => {
        if (entry.path.endsWith(".csv")) {
          entry
            .pipe(csv())
            .on("data", (row) => rows.push(row))
            .on("end", resolve)
            .on("error", reject);
        } else {
          entry.autodrain();
        }
      })
      .on("error", reject);
  });
  const result = extractAccountPerformanceByDate(rows);
  return result;
}

function extractAccountPerformanceByDate(data) {
  const result = {};

  data.forEach(row => {
    const values = Object.values(row);
    const date = values[0];
    // console.log("values==>",values);

    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      result[date] = {
        date,
        spend: Number(values[1]),
        clicks: Number(values[2]),
        impressions: Number(values[3]),
        conversions: Number(values[4]),
        revenue: Number(values[5]),
      };
    }
  });

  return result;
}





// export function prepareReportBody(requestData,accessToken){
//     const startDate = dayjs(requestData?.startDate);
//     const endDate   = dayjs(requestData?.endDate);
//     const body = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
//             xmlns:i="http://www.w3.org/2001/XMLSchema-instance"
//             xmlns="https://bingads.microsoft.com/Reporting/v13">
//             <s:Header>
//                 <AuthenticationToken>${accessToken}</AuthenticationToken>
//                 <CustomerId>${process.env.BING_CUSTOMER_ID}</CustomerId>
//                 <CustomerAccountId>${requestData?.accountId}</CustomerAccountId>
//                 <DeveloperToken>${process.env.BING_DEVELOPER_TOKEN}</DeveloperToken>
//             </s:Header>

//             <s:Body>
//                 <SubmitGenerateReportRequest>
//                 <ReportRequest i:type="KeywordPerformanceReportRequest">
//                     <Format>Csv</Format>

//                     <ReportName>Keyword Report</ReportName>

//                     <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>

//                     <Aggregation>Daily</Aggregation>
//                     <Columns>
//                     <KeywordPerformanceReportColumn>Keyword</KeywordPerformanceReportColumn>
//                     <KeywordPerformanceReportColumn>Spend</KeywordPerformanceReportColumn>
//                     <KeywordPerformanceReportColumn>Conversions</KeywordPerformanceReportColumn>
//                     <KeywordPerformanceReportColumn>Clicks</KeywordPerformanceReportColumn>
//                     <KeywordPerformanceReportColumn>Impressions</KeywordPerformanceReportColumn>
//                     </Columns>
//                     <Scope>
//                         <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
//                             <a:long>${requestData?.accountId}</a:long>
//                         </AccountIds>
//                         <AdGroupIds i:nil="true" />
//                         <CampaignIds i:nil="true" />
//                     </Scope>

//                     <Time>
//                     <CustomDateRangeEnd>
//                         <Day>${endDate.date()}</Day><Month>${endDate.month() + 1}</Month><Year>${endDate.year()}</Year>
//                     </CustomDateRangeEnd>
//                     <CustomDateRangeStart>
//                         <Day>${startDate.date()}</Day><Month>${startDate.month() + 1}</Month><Year>${startDate.year()}</Year>
//                     </CustomDateRangeStart>
//                     </Time>

//                     </ReportRequest>
//                     </SubmitGenerateReportRequest>
//                 </s:Body>
//                 </s:Envelope>`;
//     return body;
// }