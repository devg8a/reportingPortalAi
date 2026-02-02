import csv from "csvtojson";

export function convertRakutenCSVToJSON(csvText) {
  const lines = csvText.split(/\r?\n/);

  // 1️⃣ Find header line (same logic as PHP)
  const headerIndex = lines.findIndex(line =>
    line.includes("Publisher ID")
  );

  if (headerIndex === -1) {
    throw new Error("CSV header row not found");
  }

  // 2️⃣ Parse headers
  const headers = parseCSVLine(lines[headerIndex]);
  const recordsKey = Object.fromEntries(
    headers.map((h, i) => [h, i])
  );

  // 3️⃣ Data rows (after header)
  const dataLines = lines.slice(headerIndex + 1);

  const allDataList = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const record = parseCSVLine(line);

    let transactionDate = getFormattedDate(record[recordsKey["Transaction Date"]]);

    if (!allDataList[transactionDate]) {
      allDataList[transactionDate] = [];
    }

    allDataList[transactionDate].push({
      transactionDate: transactionDate,
      publisherId: clean(record[recordsKey["Publisher ID"]]),
      publisherName: clean(record[recordsKey["Publisher Name"]]),
      publisherGroup: clean(record[recordsKey["Publisher Group Name"]]),
      sales: toNumber(record[recordsKey["Sales"]]),
      gross_total_cost: toNumber(record[recordsKey["Estimated Gross Total Cost"]]),
      net_total_cost: toNumber(record[recordsKey["Estimated Net Total Cost"]]),
      total_commission: toNumber(record[recordsKey["Total Commission"]]),
      orders: toInt(record[recordsKey["# of Orders"]]),
      clicks: toInt(record[recordsKey["# of Clicks"]]),
      referrer_url: clean(record[recordsKey["Referrer URL"]]),
    });
  }

  return allDataList;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}


function clean(value = "") {
  return value.replace(/^"|"$/g, "").trim();
}

function toNumber(value) {
  const num = Number(String(value || "").replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

function toInt(value) {
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

export function getFormattedDate(date){
  const [m, d, y] = date.split("/");
  const formattedDate = `20${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return formattedDate;
}
