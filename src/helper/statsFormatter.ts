export const formatStat = (
    value: number | string | null | undefined,
    field: string
): string => {
    if (value === null || value === undefined || value === "") return "";

    const rawNumVal = Number(value);
    if (isNaN(rawNumVal)) return String(value);

    // 🔥 GLOBAL: remove minus sign everywhere
    const numVal = Math.abs(rawNumVal);

    const f = field.toLowerCase().trim();

    // Currency fields
    const currencyFields = [
        "revenue",
        "spend",
        "cpc",
        "aov",
        "gross_sales",
        "discount",
        "google_cost",
        "meta_cost",
        "total_cost",
        "cost_per_session",
    ];

    if (currencyFields.includes(f)) {
        return `$${numVal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    // Count fields
    const countFields = [
        "orders",
        "impressions",
        "clicks",
        "sessions",
        "recipients",
        "num_emails",
        "outbound_clicks",
    ];

    if (countFields.includes(f) || f === "number") {
        return numVal.toLocaleString("en-US", {
            maximumFractionDigits: 0,
        });
    }


    // Percentage fields
    const percentageFields = [
        "ctr",
        "cvr",
        "meta_percent",
        "conv_rate",
        "discount_percent",
        "open_rate",
        "click_rate",
        "percent_of_spend",
        "percent_of_sale",
    ];

    if (percentageFields.includes(f)) {
        return `${numVal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}%`;
    }

    // Default numeric
    return numVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
