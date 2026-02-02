export function getFormattedDataList(rawDataList) {
    const grouped = {};

    for (const daywiseData of rawDataList) {
        var date = daywiseData?.segments?.date;
        const hour = daywiseData?.segments?.hour;
        if (!date) continue;

        if (hour !== undefined) {
            const hourFormatted = String(hour).padStart(2, '0') + ":00";
            date = `${date} ${hourFormatted}`;
        }

        const costMicros = Number(daywiseData?.metrics?.cost_micros || 0);
        const spend = costMicros / 1000000; // Convert micros to dollars
        const revenue = to2Decimal(daywiseData?.metrics?.conversions_value_by_conversion_date || daywiseData?.metrics?.conversions_value || 0);

        grouped[date] = {
            date,
            hour: hour !== undefined ? `${String(hour).padStart(2, '0')}:00:00 - ${String(hour).padStart(2, '0')}:59:59` : undefined,
            cost_micros: costMicros,
            cost: to2Decimal(spend),
            spend: to2Decimal(spend),
            conversions: to2Decimal(daywiseData?.metrics?.conversions || 0),
            conversions_value: to2Decimal(daywiseData?.metrics?.conversions_value || 0),
            conversions_value_by_conversion_date: to2Decimal(daywiseData?.metrics?.conversions_value_by_conversion_date || 0),
            conversions_by_conversion_date: to2Decimal(daywiseData?.metrics?.conversions_by_conversion_date || 0),
            clicks: Number(daywiseData?.metrics?.clicks || 0),
            impressions: Number(daywiseData?.metrics?.impressions || 0),
            search_impression_share: to2Decimal(daywiseData?.metrics?.search_impression_share || 0),
            interactions: Number(daywiseData?.metrics?.interactions || 0),
            revenue: revenue,
        }

    }
    return grouped;
}

const to2Decimal = (value: any): number =>
    Number(Number(value ?? 0).toFixed(2));
