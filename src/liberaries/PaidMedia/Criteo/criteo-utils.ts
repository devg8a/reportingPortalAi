export function buildDaywiseMetrics(rawDataList: { Rows?: any[] }, granularity: 'daily' | 'hourly' = 'daily') {
  if (!rawDataList?.Rows?.length) return {};

  const dailyData = rawDataList?.Rows?.reduce((record: Record<string, any>, data: any) => {
    const date = data?.Day;
    if (!date) return record;
    record[date] = {
        date,
        clicks                   : Number(data?.Clicks ?? 0),
        advertiserCost           : to2Decimal(data?.AdvertiserCost ?? 0),
        revenueGeneratedAllPc30d : to2Decimal(data?.RevenueGeneratedAllPc30d ?? 0),
        spend                     : to2Decimal(data?.AdvertiserCost ?? 0),
        revenue                   : to2Decimal(data?.RevenueGeneratedAllPc30d ?? 0),
    };

    return record;
  }, {});

  // If hourly granularity requested, distribute daily data across 24 hours
  if (granularity === 'hourly') {
    const hourlyData: Record<string, any> = {};
    Object.entries(dailyData).forEach(([date, data]: [string, any]) => {
      for (let hour = 0; hour < 24; hour++) {
        const hourFormatted = String(hour).padStart(2, '0') + ':00';
        const dateKey = `${date} ${hourFormatted}`;
        
        hourlyData[dateKey] = {
          date: dateKey,
          hour: `${hourFormatted}:00 - ${hourFormatted}:59:59`,
          clicks                   : Number(Math.round((data?.clicks ?? 0) / 24)),
          advertiserCost           : to2Decimal((data?.advertiserCost ?? 0) / 24),
          revenueGeneratedAllPc30d : to2Decimal((data?.revenueGeneratedAllPc30d ?? 0) / 24),
          spend                     : to2Decimal((data?.spend ?? 0) / 24),
          revenue                   : to2Decimal((data?.revenue ?? 0) / 24),
        };
      }
    });
    return hourlyData;
  }

  return dailyData;
}


const to2Decimal = (value: any): number =>
  Number(Number(value ?? 0).toFixed(2));