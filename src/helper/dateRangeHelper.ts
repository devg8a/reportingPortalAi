import moment from 'moment';

// Date range helpers for hourly comparison
export const getHourlyComparisonRanges = () => {
    const now = moment.utc();
    const currentHour = now.hours();
    const currentMinute = now.minutes();

    return {
        today: {
            start: moment.utc().startOf('day'),
            end: moment.utc(),
            hourLimit: currentHour,
            minuteLimit: currentMinute
        },
        yesterday: {
            start: moment.utc().subtract(1, 'days').startOf('day'),
            end: moment.utc().subtract(1, 'days').endOf('day'),  // Full day
            hourLimit: null,  // No hour limit
            minuteLimit: null
        },
        dayBeforeYesterday: {
            start: moment.utc().subtract(2, 'days').startOf('day'),
            end: moment.utc().subtract(2, 'days').endOf('day'),  // Full day
            hourLimit: null,  // No hour limit
            minuteLimit: null
        },
        sevenDays: {
            // Last 7 days including today -> today and previous 6 days
            start: moment.utc().subtract(6, 'days').startOf('day'),
            end: moment.utc(),
            hourLimit: currentHour,
            minuteLimit: currentMinute
        },
        thirtyDays: {
            // Last 30 days including today -> today and previous 29 days
            start: moment.utc().subtract(29, 'days').startOf('day'),
            end: moment.utc().endOf('day'),
            hourLimit: null,
            minuteLimit: null
        },
        previousSevenDays: {
            start: moment.utc().subtract(14, 'days').startOf('day'),
            end: moment.utc().subtract(8, 'days').endOf('day'),
            hourLimit: null,
            minuteLimit: null
        },
        previousThirtyDays: {
            start: moment.utc().subtract(60, 'days').startOf('day'),
            end: moment.utc().subtract(31, 'days').endOf('day'),
            hourLimit: null,
            minuteLimit: null
        }
    };
};

// Check if we should use live or recent data
export const shouldUseLiveOrRecent = (
    start: moment.Moment,
    end: moment.Moment
): boolean => {
    const now = moment.utc();
    const cutoff = moment.utc().subtract(30, 'days');
    return start.isSameOrAfter(cutoff) || end.isSameOrAfter(cutoff);
};

// Check if we should use hourly data
export const shouldUseHourlyData = (
    start: moment.Moment,
    end: moment.Moment,
): boolean => {
    const daySpan = end.diff(start, "days") + 1;
    return daySpan <= 2;
};

// Get comparison date range based on type
export const getComparisonRange = (
    currentStart: moment.Moment,
    currentEnd: moment.Moment,
    comparisonType: 'yesterday_same_hour' | 'previous_period' | 'custom',
    customStart?: moment.Moment,
    customEnd?: moment.Moment
): { start: moment.Moment; end: moment.Moment } | null => {
    if (comparisonType === 'custom' && customStart && customEnd) {
        return { start: customStart, end: customEnd };
    }

    if (comparisonType === 'yesterday_same_hour') {
        return {
            start: moment(currentStart).subtract(1, 'days'),
            end: moment(currentEnd).subtract(1, 'days')
        };
    }

    if (comparisonType === 'previous_period') {
        const duration = currentEnd.diff(currentStart, 'days') + 1;
        return {
            start: moment(currentStart).subtract(duration, 'days'),
            end: moment(currentEnd).subtract(duration, 'days')
        };
    }

    return null;
};
