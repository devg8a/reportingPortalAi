import dayjs from "dayjs";
import mongoose from "mongoose";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);

export function returnResponse(statusCode, status, message, response, data = null): string {
    const responseData = {} as any;
    responseData.success = status;
    responseData.status_code = statusCode;
    responseData.message = message;
    responseData.data = data ? data : {};
    return response.status(statusCode).json(responseData);
}

export function getDateRange(foramt = 'YYYY-MM-DD') {
    const date = new Date();
    var dateRange = {
        start_date: dayjs().startOf("month").format(foramt),
        end_date  : dayjs().subtract(1, "day").format(foramt),
    }
    if (date.getDate() == 1) {
        dateRange = {
            start_date: dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
            end_date  : dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
        }
    }
    return dateRange;
}

export function getRangeBetweenDates(startDate,endDate,type:any = "year"){
    const start = dayjs(startDate);
    const end   = dayjs(endDate);

    const from = start.isBefore(end) ? start : end;
    const to   = start.isBefore(end) ? end : start;
    
    const results: string[] = [];

    let cursor = from.startOf(type);

    while (cursor.isSameOrBefore(to)) {

        if (type === "day") {
            results.push(cursor.format("YYYY-MM-DD"));
            cursor = cursor.add(1, "day");
        }

        else if (type === "month") {
            results.push(cursor.format("YYYY-MM"));
            cursor = cursor.add(1, "month");
        }

        else if (type === "year") {
            results.push(cursor.format("YYYY"));
            cursor = cursor.add(1, "year");
        }
    }
  return results;
}

export function formattedDate(date, foramt = 'YYYY-MM-DD') {
    return dayjs(date).format(foramt);
}

export function getUtcDate(date, type = 'start') {
    const utcDate = new Date(date);
    if(type == "start"){
        utcDate.setUTCHours(0, 0, 0, 0)
    }
    else{
        utcDate.setUTCHours(23, 59, 59, 999);
    }
    return utcDate;
}

export function getMongoDbObjectId(inputId) {
    return new mongoose.Types.ObjectId(inputId);
}
