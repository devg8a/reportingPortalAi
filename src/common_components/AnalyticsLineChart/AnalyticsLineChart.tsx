import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import "./AnalyticsLineChart.css";

export interface SeriesItem {
  name: string;
  data: number[];
  color?: string;
  yAxisIndex?: number;
}

export interface AnalyticsLineChartProps {
  categories?: string[];
  series?: SeriesItem[];
  comparison?: {
    labels?: string[];
    series?: {
      revenue?: number[];
      channel_revenue?: number[];
      shopify_revenue?: number[];
      spend?: number[];
      roas?: number[];
      roas_channel?: number[];
      roas_shopify?: number[];
      cpc?: number[];
      sessions?: number[];
      clicks?: number[];
      outbound_clicks?: number[];
    };
  };
  showLegend?: boolean;
  height?: number;
  width?: string;
  onCompareToggle?: (enabled: boolean) => void;
}

type ComparisonSeries = NonNullable<AnalyticsLineChartProps["comparison"]>["series"];

const METRIC_CONFIG: Record<
  string,
  {
    format: (v: number) => string;
    color: string;
    compareColor: string;
    comparisonKey: keyof ComparisonSeries;
  }
> = {
  "Channel Revenue": {
    format: v =>
      `$${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    color: "#EC4899",
    compareColor: "#F9A8D4",
    comparisonKey: "channel_revenue",
  },
  "Shopify Revenue": {
    format: v =>
      `$${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    color: "#3B82F6",
    compareColor: "#93C5FD",
    comparisonKey: "shopify_revenue",
  },
  Revenue: {
    format: v =>
      `$${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    color: "#ec4899",
    compareColor: "#F9A8D4",
    comparisonKey: "revenue",
  },
  Spend: {
    format: v =>
      `$${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    color: "#10b981",
    compareColor: "#6EE7B7",
    comparisonKey: "spend",
  },
  ROAS: {
    format: v => v.toFixed(2),
    color: "#6366f1",
    compareColor: "#A5B4FC",
    comparisonKey: "roas",
  },
  "ROAS (Channel)": {
    format: v => v.toFixed(2),
    color: "#6366f1",
    compareColor: "#A5B4FC",
    comparisonKey: "roas_channel",
  },
  "ROAS (Shopify)": {
    format: v => v.toFixed(2),
    color: "#8B5CF6",
    compareColor: "#C4B5FD",
    comparisonKey: "roas_shopify",
  },
  CPC: {
    format: v => `$${v.toFixed(2)}`,
    color: "#f59e0b",
    compareColor: "#FCD34D",
    comparisonKey: "cpc",
  },
  Sessions: {
    format: v => v.toLocaleString(),
    color: "#8b5cf6",
    compareColor: "#C4B5FD",
    comparisonKey: "sessions",
  },
  Clicks: {
    format: v => v.toLocaleString(),
    color: "#0ea5e9",
    compareColor: "#7DD3FC",
    comparisonKey: "clicks",
  },
  "Outbound Clicks": {
    format: v => v.toLocaleString(),
    color: "#14b8a6",
    compareColor: "#5EEAD4",
    comparisonKey: "outbound_clicks",
  },
};

const formatFallback = (v: number) =>
  Number.isFinite(v) ? v.toLocaleString() : `${v}`;

const AnalyticsLineChart = ({
  categories = [],
  series = [],
  comparison,
  showLegend = true,
  height = 400,
  width = "100%",
  onCompareToggle,
}: AnalyticsLineChartProps) => {
  const [showCompare, setShowCompare] = useState(false);
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set());


  const hasComparison =
    !!comparison?.labels?.length &&
    !!comparison?.series &&
    Object.values(comparison.series).some(v => v && v.length);

  const isCompareActive = showCompare && hasComparison;

  /* ---------------- DETECT DATA TYPE (HOURLY / DAILY) ---------------- */
  const dataType = useMemo<"hourly" | "daily">(() => {
    if (!categories.length) return "daily";
    const first = categories[0];
    // Check for HH:MM or simple hour number (0-23)
    if (first.includes(":") || /^(\d{1,2})$/.test(first)) return "hourly";
    return "daily";
  }, [categories]);

  /* ---------------- LENGTHS (ZOOM WHEN COMPARE OFF) ---------------- */
  // ✅ current chart should "zoom" to actual series length (not long categories)
  const currentDataLength = useMemo(() => {
    const maxSeriesLen = series.reduce((max, s) => Math.max(max, s.data?.length || 0), 0);
    return maxSeriesLen;
  }, [series]);

  const currentDisplayLength = useMemo(() => {
    // if we have data points, use them; else fallback to categories length
    return currentDataLength > 0 ? currentDataLength : categories.length;
  }, [currentDataLength, categories.length]);

  const compareDisplayLength = useMemo(() => {
    const compareLabelsLen = comparison?.labels?.length || 0;

    const compareSeriesLen = comparison?.series
      ? Math.max(
        0,
        ...Object.values(comparison.series).map(arr => (arr ? arr.length : 0))
      )
      : 0;

    // include categories length too (if it's the full range)
    return Math.max(currentDisplayLength, categories.length, compareLabelsLen, compareSeriesLen);
  }, [comparison?.labels?.length, comparison?.series, currentDisplayLength, categories.length]);

  const displayLength = useMemo(
    () => (isCompareActive ? compareDisplayLength : currentDisplayLength),
    [isCompareActive, compareDisplayLength, currentDisplayLength]
  );

  /* ---------------- HOURLY: CHECK IF DATE PRESENT IN STRING ---------------- */
  const hourlyHasDate = useMemo(() => {
    if (dataType !== "hourly") return false;
    const sample = categories[0] || comparison?.labels?.[0] || "";
    return /(\d{4}-\d{2}-\d{2})|(\d{1,2}\s+[A-Za-z]{3})|([A-Za-z]{3}\s+\d{1,2})/.test(
      sample
    );
  }, [dataType, categories, comparison?.labels]);

  /* ---------------- HELPERS: PARSE + FORMAT DATES FOR AXIS ---------------- */

  const parseToDate = (str: string): Date | null => {
    if (!str) return null;

    const fullMatch = str.match(/(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
    if (fullMatch) {
      const [, datePart, h, m] = fullMatch;
      const d = new Date(`${datePart}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`);
      if (!isNaN(d.getTime())) return d;
    }

    const isoDate = str.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (isoDate) {
      const d = new Date(`${isoDate[1]}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }

    const timeOnly = str.match(/^(\d{1,2}):(\d{2})$/);
    if (timeOnly) {
      const now = new Date();
      now.setHours(parseInt(timeOnly[1], 10), parseInt(timeOnly[2], 10), 0, 0);
      return now;
    }

    // Handle single hour number (e.g. "0", "15")
    const hourOnly = str.match(/^(\d{1,2})$/);
    if (hourOnly) {
      const h = parseInt(hourOnly[1], 10);
      if (h >= 0 && h <= 24) {
        const now = new Date();
        now.setHours(h, 0, 0, 0);
        return now;
      }
    }

    const generic = new Date(str);
    return isNaN(generic.getTime()) ? null : generic;
  };

  const formatAxisLabel = (
    raw: string,
    type: "daily" | "hourly",
    includeDateInHourly: boolean
  ): string => {
    const d = parseToDate(raw);
    if (!d) return raw;

    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");

    if (type === "daily") return `${day} ${month}`;
    if (includeDateInHourly) return `${day} ${month} ${hours}:${mins}`;
    return `${hours}:${mins}`;
  };

  const extendLabels = (
    rawLabels: string[],
    totalLength: number,
    type: "daily" | "hourly",
    includeDateInHourly: boolean
  ): string[] => {
    if (totalLength <= 0) return [];
    if (!rawLabels.length) return Array(totalLength).fill("");

    // Format existing labels
    const result: string[] = rawLabels.map(l => formatAxisLabel(l, type, includeDateInHourly));

    // Trim if needed (this is what "zooms" when compare is OFF)
    if (result.length >= totalLength) {
      return result.slice(0, totalLength);
    }

    // Extend if needed
    let lastDate = parseToDate(rawLabels[rawLabels.length - 1]);
    if (!lastDate) {
      while (result.length < totalLength) result.push("");
      return result;
    }

    while (result.length < totalLength) {
      lastDate = new Date(
        lastDate.getTime() + (type === "hourly" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      );

      const day = lastDate.getDate();
      const month = lastDate.toLocaleString("en-US", { month: "short" });
      const hours = lastDate.getHours().toString().padStart(2, "0");
      const mins = lastDate.getMinutes().toString().padStart(2, "0");

      if (type === "daily") result.push(`${day} ${month}`);
      else
        result.push(includeDateInHourly ? `${day} ${month} ${hours}:${mins}` : `${hours}:${mins}`);
    }

    return result;
  };

  /* ---------------- X-AXIS LABELS ---------------- */
  const xLabels = useMemo(
    () => extendLabels(categories, displayLength, dataType, hourlyHasDate),
    [categories, displayLength, dataType, hourlyHasDate]
  );

  /* ---------------- SERIES BUILD ---------------- */
  const { apexSeries, seriesMetaMap } = useMemo(() => {
    const pad = (arr?: number[]) => {
      const base = arr ? arr.slice(0, displayLength) : [];
      const need = Math.max(0, displayLength - base.length);
      return [...base, ...Array(need).fill(null)];
    };

    const metaMap: { name: string; isComparison: boolean; color: string }[] = [];

    const baseSeries = series.map(s => {
      const color = s.color || METRIC_CONFIG[s.name]?.color || "#888";
      metaMap.push({ name: s.name, isComparison: false, color });

      return {
        name: s.name,
        data: pad(s.data),
        color,
        yAxisIndex: s.yAxisIndex || 0,
      };
    });

    if (!isCompareActive) {
      return { apexSeries: baseSeries, seriesMetaMap: metaMap };
    }

    const compareSeries: typeof baseSeries = [];

    baseSeries.forEach(baseSer => {
      const metricName = baseSer.name;
      const config = METRIC_CONFIG[metricName];
      if (!config) return;

      const compKey = config.comparisonKey;
      const compData = comparison?.series?.[compKey];

      if (compData && compData.length) {
        metaMap.push({
          name: metricName,
          isComparison: true,
          color: config.compareColor,
        });

        compareSeries.push({
          name: "", // ✅ empty => no legend dot
          data: pad(compData),
          color: config.compareColor,
          yAxisIndex: (baseSer as any).yAxisIndex || 0,
        });
      }
    });

    return {
      apexSeries: [...baseSeries, ...compareSeries],
      seriesMetaMap: metaMap,
    };
  }, [series, comparison, displayLength, isCompareActive]);

  const { visibleSeries, visibleMetaMap } = useMemo(() => {
    const vs: typeof apexSeries = [];
    const vm: typeof seriesMetaMap = [];
    apexSeries.forEach((s, i) => {
      const meta = seriesMetaMap[i];
      if (meta && !hiddenMetrics.has(meta.name)) {
        vs.push(s);
        vm.push(meta);
      }
    });
    return { visibleSeries: vs, visibleMetaMap: vm };
  }, [apexSeries, seriesMetaMap, hiddenMetrics]);

  /* ---------------- CHART OPTIONS ---------------- */
  const chartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
      },

      stroke: {
        curve: "smooth",
        width: 2.5,
        dashArray: visibleSeries.map(s => (s.name === "" ? 6 : 0)),
      },

      markers: { size: 0 },

      xaxis: {
        type: "category",
        categories: xLabels,
        labels: {
          style: { fontSize: "10px" },
          hideOverlappingLabels: true,
        },
        // ✅ Compare ON => more ticks, Compare OFF => fewer ticks (zoom feel)
        tickAmount:
          dataType === "hourly"
            ? isCompareActive
              ? Math.min(24, displayLength)
              : Math.min(12, displayLength)
            : isCompareActive
              ? Math.min(20, displayLength)
              : Math.min(15, displayLength),
      },

      yaxis: [
        {
          labels: {
            formatter: (value: number | undefined) => {
              // ✅ Check if value exists and is valid
              if (value === undefined || value === null || isNaN(value)) {
                return '';
              }

              // ✅ Format only if value > 0
              if (value === 0) {
                return '$0';
              }

              // ✅ Format with K/M suffix
              if (value >= 1000000) {
                return `$${(value / 1000000).toFixed(1)}M`;
              }
              if (value >= 1000) {
                return `$${(value / 1000).toFixed(0)}K`;
              }

              return `$${value.toFixed(0)}`;
            }
          }
        },
        {
          opposite: true,
          labels: {
            formatter: (val: number) => val.toFixed(0)
          }
        },
      ],

      legend: {
        show: false,
      },



      tooltip: {
        shared: true,
        intersect: false,

        custom: ({ series: seriesData, dataPointIndex }) => {
          const currentDate = categories[dataPointIndex] || "—";
          const previousDate = comparison?.labels?.[dataPointIndex] || "—";
          const periodLabel = dataType === "hourly" ? "Time" : "Date";

          const currentMetrics: { name: string; value: number; color: string }[] = [];
          const previousMetrics: { name: string; value: number; color: string }[] = [];

          visibleMetaMap.forEach((meta, idx) => {
            const v = seriesData[idx]?.[dataPointIndex];
            if (typeof v !== "number") return;

            if (meta.isComparison) previousMetrics.push({ name: meta.name, value: v, color: meta.color });
            else currentMetrics.push({ name: meta.name, value: v, color: meta.color });
          });

          const hasCurrentMetrics = currentMetrics.length > 0;
          const hasPreviousMetrics = previousMetrics.length > 0 && isCompareActive;

          const showCurrentColumn = hasCurrentMetrics || currentDate !== "—";
          const showPreviousColumn = hasPreviousMetrics || (isCompareActive && previousDate !== "—");

          const visibleColumns = (showCurrentColumn ? 1 : 0) + (showPreviousColumn ? 1 : 0);
          if (visibleColumns === 0) return "";

          const minWidth = visibleColumns === 2 ? "420px" : "200px";

          let html = `
            <div style="
              display:flex;
              gap:20px;
              padding:12px 14px;
              border-radius:10px;
              background:#ffffff;
              box-shadow:0 8px 24px rgba(0,0,0,0.12);
              min-width:${minWidth};
              font-family:Inter, system-ui, sans-serif;
            ">
          `;

          if (showCurrentColumn) {
            html += `
              <div style="flex:1">
                <div style="
                  font-weight:700;
                  font-size:12px;
                  margin-bottom:8px;
                  color:#374151;
                  background:#f3f4f6;
                  padding:4px 8px;
                  border-radius:4px;
                ">
                  ${periodLabel}: ${currentDate}
                </div>
            `;

            currentMetrics.forEach(({ name, value, color }) => {
              const formatted = METRIC_CONFIG[name]?.format
                ? METRIC_CONFIG[name].format(value)
                : formatFallback(value);

              html += `
                <div style="color:${color};font-size:13px;margin:4px 0">
                  ${name}: <b>${formatted}</b>
                </div>
              `;
            });

            html += `</div>`;
          }

          if (showPreviousColumn) {
            const borderStyles = showCurrentColumn
              ? "border-left:1px solid #e5e7eb;padding-left:16px;"
              : "";

            html += `
              <div style="flex:1;${borderStyles}">
                <div style="
                  font-weight:700;
                  font-size:12px;
                  margin-bottom:8px;
                  color:#6b7280;
                  background:#f9fafb;
                  padding:4px 8px;
                  border-radius:4px;
                ">
                  ${periodLabel}: ${previousDate}
                </div>
            `;

            previousMetrics.forEach(({ name, value, color }) => {
              const formatted = METRIC_CONFIG[name]?.format
                ? METRIC_CONFIG[name].format(value)
                : formatFallback(value);

              html += `
                <div style="color:${color};font-size:13px;margin:4px 0">
                  ${name}: <b>${formatted}</b>
                </div>
              `;
            });

            html += `</div>`;
          }

          html += `</div>`;
          return html;
        },
      },
    }),
    [
      visibleSeries,
      visibleMetaMap,
      xLabels,
      dataType,
      displayLength,
      isCompareActive,
      showLegend,
      series,
      categories,
      comparison,
    ]
  );

  return (
    <div className="analytics-line-chart-wrapper" style={{ position: "relative" }}>
      <Chart
        // ✅ important: forces proper shrink/expand when toggling compare
        key={`${isCompareActive ? "compare-on" : "compare-off"}-${[...hiddenMetrics].sort().join()}`}
        options={chartOptions}
        series={visibleSeries as any}
        type="line"
        height={height}
        width={width}
      />

      {showLegend && (
        <div style={{ display: "flex", gap: "16px", padding: "8px 0 4px 10px", flexWrap: "wrap" }}>
          {seriesMetaMap
            .filter(m => !m.isComparison)
            .filter((m, i, arr) => arr.findIndex(x => x.name === m.name) === i)
            .map(m => {
              const isHidden = hiddenMetrics.has(m.name);
              return (
                <div
                  key={m.name}
                  onClick={() => {
                    setHiddenMetrics(prev => {
                      const next = new Set(prev);
                      if (next.has(m.name)) next.delete(m.name);
                      else next.add(m.name);
                      return next;
                    });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    opacity: isHidden ? 0.4 : 1,
                    fontSize: "12px",
                    color: "#374151",
                    userSelect: "none",
                  }}
                >
                  <span style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: isHidden ? "#d1d5db" : m.color,
                    display: "inline-block",
                  }} />
                  <span style={{ textDecoration: isHidden ? "line-through" : "none" }}>
                    {m.name}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <div className="chart-footer-row">
        <div id="chart-legend-placeholder" />

        {hasComparison && (
          <div className="chart-compare-toggle">
            <label>
              <input
                type="checkbox"
                checked={showCompare}
                onChange={e => {
                  setShowCompare(e.target.checked);
                  onCompareToggle?.(e.target.checked);
                }}
              />
              Compare with prior period
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsLineChart;
