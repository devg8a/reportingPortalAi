export function buildDaywiseMetrics(insightDataList: any[]) {
  if (!insightDataList?.length) return {};

  return insightDataList.reduce((record: Record<string, any>, insightData: any) => {
    let dateKey = insightData?.date_start;
    let hourValue = null;

    // Check if hourly data exists
    if (insightData?.hourly_stats_aggregated_by_advertiser_time_zone) {
      // Meta returns format like "00:00:00 - 00:59:59"
      const hourTime = insightData.hourly_stats_aggregated_by_advertiser_time_zone;
      const hourStart = hourTime.split(' - ')[0]; // "00:00:00"

      // Directly use advertiser timezone hour — NO CONVERSION
      const hourMatch = hourStart.match(/^(\d{2}):\d{2}:\d{2}/);
      const advertiserHour = hourMatch ? parseInt(hourMatch[1], 10) : 0;

      // Build key in advertiser timezone itself
      dateKey = `${dateKey} ${String(advertiserHour).padStart(2, '0')}:00`;
      hourValue = advertiserHour;
    }

    if (!dateKey) return record;
    // console.log(Number(insightData?.action_values?.[0]?.value ?? 0), "insightData?.action_values?.[0]?.value")


    const clicks = Number(insightData?.clicks ?? 0);
    const impressions = to2Decimal(insightData?.impressions ?? 0);
    const spend = to2Decimal(insightData?.spend ?? 0);


    const actionValues = insightData?.action_values || [];
    const purchaseValue = actionValues.find((v: any) => v.action_type === 'omni_purchase');

    const purchaseValueObj = actionValues.find((v) => v.action_type === 'omni_purchase');

    // const revenue = purchaseValue ? to2Decimal(purchaseValue['value'] || 0) : 0;
    // console.log(dateKey, "datekeyyyyy", revenue, "revenue")
    const revenue = purchaseValueObj ? to2Decimal(purchaseValueObj.value || 0) : 0;

    const revenue_1d_view = purchaseValue ? to2Decimal(purchaseValue['1d_view'] || 0) : 0;
    const revenue_7d_click = purchaseValue ? to2Decimal(purchaseValue['7d_click'] || 0) : 0;

    // 🔍 DEBUG
    // if (purchaseValue) {
    //   console.log(`🔍 Meta Utils: Date: ${dateKey}, 1d_view: ${revenue_1d_view}, 7d_click: ${revenue_7d_click}`);
    // }

    record[dateKey] = {
      date: dateKey,
      hour: insightData?.hourly_stats_aggregated_by_advertiser_time_zone,
      outbound_clicks: Number(insightData?.outbound_clicks?.[0]?.value ?? 0),
      clicks,
      impressions,
      spend,
      reach: to2Decimal(insightData?.reach ?? 0),
      revenue,
      revenue_1d_view,   // 🔴 NEW
      revenue_7d_click,  // 🔴 NEW
      actions: insightData?.actions,
      action_values: insightData?.action_values,
      cpc: clicks > 0 ? to2Decimal(spend / clicks) : 0,
      ctr: impressions > 0 ? to2Decimal((clicks / impressions) * 100) : 0,
      roas: spend > 0 ? to2Decimal(revenue / spend) : 0,
    };

    return record;
  }, {});
}

const to2Decimal = (value: any): number =>
  Number(Number(value ?? 0).toFixed(2));
