import dayjs from "dayjs";

export function buildDaywiseMetrics(reportDataList: any[]) {
  if (!reportDataList?.length) return {};

  return reportDataList.reduce((record: Record<string, any>, reportData: any) => {
    const firstDimensionValue = reportData?.dimensionValues[0]?.value;
    const channelGroup = reportData?.dimensionValues[1]?.value || 'Unknown';
    let dateKey: string;
    let hour: number | undefined;

    // Check if it's dateHour format (YYYYMMDDHH - 10 digits) for hourly granularity
    if (firstDimensionValue && firstDimensionValue.length === 10 && /^\d{10}$/.test(firstDimensionValue)) {
      // Parse dateHour: YYYYMMDDHH
      const dateStr = firstDimensionValue.substring(0, 8); // YYYYMMDD
      const hourValue = parseInt(firstDimensionValue.substring(8, 10), 10); // HH

      // Format date as YYYY-MM-DD
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const formattedDate = `${year}-${month}-${day}`;

      // Use hour directly without conversion
      const hourFormatted = String(hourValue).padStart(2, '0') + ":00";
      dateKey = `${formattedDate} ${hourFormatted}`;
      hour = hourValue;
    } else {
      // Daily granularity - just parse the date (YYYYMMDD format)
      dateKey = dayjs(firstDimensionValue).format('YYYY-MM-DD');
    }

    if (!dateKey) return record;

    const sessions = Number(reportData?.metricValues[1]?.value);
    const transactions = Number(reportData?.metricValues[2]?.value);
    const conversionRate = sessions > 0 ? to2Decimal(transactions / sessions) : 0;

    const channelData = {
      channel: channelGroup,
      totalRevenue: to2Decimal(reportData?.metricValues[0]?.value),
      sessions: sessions,
      engagedSessions: Number(reportData?.metricValues[2]?.value),
      transactions: transactions,
      itemsPurchased: Number(reportData?.metricValues[3]?.value),
      newUsers: Number(reportData?.metricValues[4]?.value),
      bounceRate: to2Decimal(Number(reportData?.metricValues[5]?.value) * 100),
      averageSessionDuration: to2Decimal(reportData?.metricValues[6]?.value),
      userEngagementDuration: to2Decimal(reportData?.metricValues[7]?.value),
      screenPageViewsPerSession: to2Decimal(reportData?.metricValues[8]?.value),
      conversionRate: conversionRate,
    };

    // Initialize date entry if it doesn't exist
    if (!record[dateKey]) {
      record[dateKey] = {
        date: dateKey,
        hour: hour ? `${String(hour).padStart(2, '0')}:00:00 - ${String(hour).padStart(2, '0')}:59:59` : undefined,
        channels: []
      };
    }

    // Add channel data to the date entry
    record[dateKey].channels.push(channelData);

    return record;
  }, {});
}


const to2Decimal = (value: any): number =>
  Number(Number(value ?? 0).toFixed(2));
