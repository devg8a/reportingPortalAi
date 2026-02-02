import dayjs from "dayjs";
import mongoose from "mongoose";

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
        end_date: dayjs().subtract(1, "day").format(foramt),
    }
    if (date.getDate() == 1) {
        dateRange = {
            start_date: dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
            end_date: dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
        }
    }
    return dateRange;
}

export function formattedDate(date, foramt = 'YYYY-MM-DD') {
    return dayjs(date).format(foramt);
}

export function getMongoDbObjectId(inputId) {
    return new mongoose.Types.ObjectId(inputId);
}
