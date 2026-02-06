// GranularityDropdown.tsx
import React, { useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import SelectInput from '../../../common_components/SelectInput';

interface DateValue {
    year: number;
    month: number;
    day: number;
}

interface GranularityDropdownProps {
    startDate: DateValue | null;
    endDate: DateValue | null;
    granularity: string;
    onChange: (value: string) => void;
}

const ALL_OPTIONS = [
    { label: 'Hourly', value: 'hourly' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
];

const GranularityDropdown: React.FC<GranularityDropdownProps> = ({
    startDate,
    endDate,
    granularity,
    onChange,
}) => {
    // Calculate valid options based on date range
    const validOptions = useMemo(() => {
        if (!startDate || !endDate) {
            return ALL_OPTIONS;
        }

        const d1 = new Date(startDate.year, startDate.month - 1, startDate.day);
        const d2 = new Date(endDate.year, endDate.month - 1, endDate.day);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays <= 1) {
            // Single day: hourly & daily only
            return ALL_OPTIONS.filter(o => ['hourly', 'daily'].includes(o.value));
        } else if (diffDays <= 7) {
            // Up to 7 days: daily & weekly only
            return ALL_OPTIONS.filter(o => ['daily', 'weekly'].includes(o.value));
        } else {
            // More than 7 days: no hourly
            return ALL_OPTIONS.filter(o => o.value !== 'hourly');
        }
    }, [startDate, endDate]);

    // Check if current granularity is valid
    const isCurrentValid = useMemo(() => {
        return validOptions.some(opt => opt.value === granularity);
    }, [validOptions, granularity]);

    // Safe value to display
    const safeValue = useMemo(() => {
        if (isCurrentValid) return granularity;
        return validOptions[0]?.value || 'daily';
    }, [isCurrentValid, granularity, validOptions]);

    // Auto-correct invalid granularity
    useEffect(() => {
        if (!isCurrentValid && validOptions.length > 0) {
            const newValue = validOptions[0].value;
            onChange(newValue);
        }
    }, [isCurrentValid, validOptions, onChange]);

    return (
        <Box sx={{ width: 140 }}>
            <SelectInput
                label=""
                placeholder="Granularity"
                name="granularity"
                value={safeValue}
                onChange={(e) => onChange(e.target.value)}
                options={validOptions}
            />
        </Box>
    );
};

export default React.memo(GranularityDropdown);