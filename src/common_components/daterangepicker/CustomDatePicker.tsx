import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Typography,
  Popper,
  ClickAwayListener,
} from '@mui/material';
import { CalendarToday, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { getLocalTimeZone, today, CalendarDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from '@internationalized/date';
import './CustomDatePicker.css';
import { useSelector } from 'react-redux';
import { selectHolidays, Holiday } from '../../redux/userDataSlice';

interface DateRange {
  start: CalendarDate;
  end: CalendarDate;
}

interface HolidayWithDate extends Omit<Holiday, 'date'> {
  start_date: string;
  end_date: string;
  date?: CalendarDate;
}

interface Preset {
  label: string;
  getRange: () => DateRange | null;
  requiresDateRange?: boolean;
  isCustom?: boolean;
}

interface CustomDatePickerProps {
  value?: DateRange | null;
  compareValue?: DateRange | null;
  onChange?: (range: DateRange | null) => void;
  onCompareChange?: (range: DateRange | null) => void;
  placeholder?: string;
  comparePlaceholder?: string;
  onApply?: (data: { mainRange: DateRange | null; compareRange: DateRange | null }) => void;
  comparison?: boolean;
  maxPastYears?: number;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value = null,
  compareValue = null,
  onChange = () => { },
  onCompareChange = () => { },
  placeholder = "Select Date Range",
  comparePlaceholder = "Select Compare Range",
  onApply,
  comparison = true,
  maxPastYears = 3
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [compareEnabled, setCompareEnabled] = useState<boolean>(!!compareValue);
  const [tempDateRange, setTempDateRange] = useState<DateRange | null>(value);
  const [tempCompareRange, setTempCompareRange] = useState<DateRange | null>(compareValue);
  const [currentMonth1, setCurrentMonth1] = useState<CalendarDate>(() => {
    const now = today(getLocalTimeZone());
    return startOfMonth(now);
  });
  const [currentMonth2, setCurrentMonth2] = useState<CalendarDate>(() => {
    const now = today(getLocalTimeZone());
    return startOfMonth(now.add({ months: 1 }));
  });
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayWithDate | null>(null);
  const [selectingCompare, setSelectingCompare] = useState<boolean>(false);
  const [isCustomCompareSelected, setIsCustomCompareSelected] = useState<boolean>(false);
  const [activeComparePreset, setActiveComparePreset] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeComparePresetUI, setActiveComparePresetUI] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const holidays = useSelector(selectHolidays);

  const parseToCalendarDate = (dateStr: string): CalendarDate => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new CalendarDate(year, month, day);
  };

  const getMaxSelectableDate = (): CalendarDate => {
    const now = today(getLocalTimeZone());
    return now; // Allow today's date
  };

  const getDefaultMainPreset = (): string => {
    const maxDate = getMaxSelectableDate();
    return maxDate.day === 1 ? "Last Month" : "This Month";
  };


  const predefinedRanges: Preset[] = [
    {
      label: "Today", getRange: () => {
        const now = getMaxSelectableDate();
        return { start: now, end: now };
      }
    },
    {
      label: "This Week",
      getRange: () => {
        const now = today(getLocalTimeZone());
        const maxDate = getMaxSelectableDate();

        const weekStart = startOfWeek(now, 'en-US');

        if (weekStart.compare(now) === 0) {
          return null;
        }

        return {
          start: weekStart,
          end: maxDate
        };
      }
    },
    {
      label: "Last 7 Days",
      getRange: () => {
        const maxDate = getMaxSelectableDate();
        return {
          start: maxDate.subtract({ days: 6 }),
          end: maxDate
        };
      }
    },
    {
      label: "Last 28 Days",
      getRange: () => {
        const maxDate = getMaxSelectableDate();
        return {
          start: maxDate.subtract({ days: 27 }),
          end: maxDate
        };
      }
    },
    {
      label: "Last 30 Days",
      getRange: () => {
        const maxDate = getMaxSelectableDate();
        return {
          start: maxDate.subtract({ days: 29 }),
          end: maxDate
        };
      }
    },
    {
      label: "This Month",
      getRange: () => {
        const now = today(getLocalTimeZone());
        const maxDate = getMaxSelectableDate();
        const monthStart = startOfMonth(now);

        if (monthStart.compare(now) === 0) {
          return null;
        }

        return {
          start: monthStart,
          end: maxDate
        };
      }
    },
    {
      label: "Last Month", getRange: () => {
        const now = today(getLocalTimeZone());
        const lastMonth = now.subtract({ months: 1 });
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
    },
    {
      label: "Last 12 Months",
      getRange: () => {
        const maxDate = getMaxSelectableDate();
        return {
          start: maxDate.subtract({ months: 11 }),
          end: maxDate
        };
      }
    },
    {
      label: "Last Calendar Year", getRange: () => {
        const now = today(getLocalTimeZone());
        const year = now.year;
        return {
          start: new CalendarDate(year - 1, 1, 1),
          end: new CalendarDate(year - 1, 12, 31)
        };
      }
    },
  ];

  // Compare range presets - these calculate based on the selected date range
  const getCompareRanges = (): Preset[] => {
    if (!tempDateRange || !tempDateRange.start || !tempDateRange.end) {
      // If no date range selected, show basic options
      return [
        {
          label: "Month-over-Month",
          getRange: () => null,
          requiresDateRange: true
        },
        {
          label: "Previous Year",
          getRange: () => null,
          requiresDateRange: true
        },
        {
          label: "Previous Period",
          getRange: () => null,
          requiresDateRange: true
        },
        {
          label: "Custom",
          getRange: () => null,
          isCustom: true
        },
      ];
    }

    const mainStart = tempDateRange.start;
    const mainEnd = tempDateRange.end;

    return [
      {
        label: "Month-over-Month",
        getRange: () => {
          // Same dates but previous month
          const compareStart = mainStart.subtract({ months: 1 });
          const compareEnd = mainEnd.subtract({ months: 1 });
          return { start: compareStart, end: compareEnd };
        }
      },
      {
        label: "Previous Year",
        getRange: () => {
          // Same dates but previous year
          const compareStart = mainStart.subtract({ years: 1 });
          const compareEnd = mainEnd.subtract({ years: 1 });
          return { start: compareStart, end: compareEnd };
        }
      },
      {
        label: "Previous Period",
        getRange: () => {
          const mainStart = tempDateRange.start;
          const mainEnd = tempDateRange.end;

          // ✅ CORRECT duration calculation
          const startJS = mainStart.toDate(getLocalTimeZone());
          const endJS = mainEnd.toDate(getLocalTimeZone());

          const duration =
            Math.round((endJS.getTime() - startJS.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          // ✅ Previous Period
          const compareEnd = mainStart.subtract({ days: 1 });
          const compareStart = compareEnd.subtract({ days: duration - 1 });

          return {
            start: compareStart,
            end: compareEnd
          };
        }
      },
      {
        label: "Custom",
        getRange: () => {
          // Custom - user will select manually
          return null;
        },
        isCustom: true
      },
    ];
  };

  useEffect(() => {
    if (value) {
      setTempDateRange(value);
      if (value.start) {
        const startMonth = startOfMonth(value.start);
        setCurrentMonth1(startMonth);
        setCurrentMonth2(startMonth.add({ months: 1 }));
      }
    }
  }, [value]);

  useEffect(() => {
    if (compareValue) {
      setTempCompareRange(compareValue);
      setCompareEnabled(true);
    } else {
      setCompareEnabled(false);
    }
  }, [compareValue]);

  const handleOpen = (isCompare: boolean = false): void => {
    setIsOpen(true);

    if (!isCompare && !tempDateRange) {
      const defaultLabel = getDefaultMainPreset();
      const preset = predefinedRanges.find(p => p.label === defaultLabel);

      if (preset) {
        const range = preset.getRange();
        if (range) {
          setTempDateRange(range);
          setActivePreset(defaultLabel);

          const startMonth = startOfMonth(range.start);
          setCurrentMonth1(startMonth);
          setCurrentMonth2(startMonth.add({ months: 1 }));
        }
      }
    }

    if (isCompare && compareEnabled) {
      setSelectingCompare(true);
      setActiveTab(0);
    } else {
      setSelectingCompare(false);
      setActiveTab(0);
    }
  };

  useEffect(() => {
    if (
      !activeComparePreset ||
      !tempDateRange?.start ||
      !tempDateRange?.end
    ) return;

    const preset = getCompareRanges().find(
      p => p.label === activeComparePreset
    );

    if (!preset || !preset.getRange) return;

    const newCompareRange = preset.getRange();
    if (newCompareRange) {
      setTempCompareRange(newCompareRange);
    }
  }, [tempDateRange?.start, tempDateRange?.end, activeComparePreset]);

  useEffect(() => {
    if (!value) {
      setActivePreset(null);
      return;
    }

    const matchedPreset = predefinedRanges.find(p => {
      const r = p.getRange();
      return (
        r?.start?.compare(value.start) === 0 &&
        r?.end?.compare(value.end) === 0
      );
    });

    setActivePreset(matchedPreset?.label ?? null);
  }, [value]);

  const handleClose = (): void => {
    setIsOpen(false);
    setTempDateRange(value);
    setTempCompareRange(compareValue);
    setSelectedHoliday(null);
    setSelectingCompare(false);
    setIsCustomCompareSelected(false);
  };

  const handleApply = (): void => {
    onChange(tempDateRange);
    if (compareEnabled && tempCompareRange) {
      onCompareChange(tempCompareRange);
    } else {
      onCompareChange(null);
    }
    onApply?.({
      mainRange: tempDateRange,
      compareRange: compareEnabled ? tempCompareRange : null,
    });
    setIsOpen(false);
    setSelectedHoliday(null);
    setSelectingCompare(false);
    setIsCustomCompareSelected(false);
  };

  const handleCancel = (): void => {
    handleClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
    setSelectedHoliday(null);
  };

  const handleCompareToggle = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const enabled = event.target.checked;
    setCompareEnabled(enabled);

    if (!enabled) {
      setTempCompareRange(null);
      setSelectingCompare(false);
      setActiveComparePreset(null);
      setActiveComparePresetUI(null);
      setIsCustomCompareSelected(false);
      return;
    }

    // 🔹 Compare ON → default MOM
    if (tempDateRange?.start && tempDateRange?.end) {
      const momPreset = getCompareRanges().find(
        p => p.label === "Month-over-Month"
      );

      if (momPreset) {
        const range = momPreset.getRange();
        if (range) {
          setTempCompareRange(range);
          setActiveComparePreset("Month-over-Month");
          setActiveComparePresetUI("Month-over-Month");
          setIsCustomCompareSelected(false);

          const startMonth = startOfMonth(range.start);
          setCurrentMonth1(startMonth);
          setCurrentMonth2(startMonth.add({ months: 1 }));
        }
      }
    }

    setSelectingCompare(true);
  };

  const handlePresetClick = (preset: Preset): void => {
    if (selectingCompare && compareEnabled) {
      // Handle compare range preset
      if (preset.isCustom) {
        // For custom, just enable manual selection
        setIsCustomCompareSelected(true);
        setSelectingCompare(true);
        // ✅ FIX: Custom ko highlight karo
        setActiveComparePresetUI(preset.label);
        setActiveComparePreset(null);
        return;
      }
      setActiveComparePresetUI(preset.label);
      if (!preset.isCustom) {
        setActiveComparePreset(preset.label);
      }
      if (preset.requiresDateRange && (!tempDateRange || !tempDateRange.start || !tempDateRange.end)) {
        // Can't calculate compare range without a date range
        return;
      }
      const range = preset.getRange();
      if (range) {
        setTempCompareRange(range);
        setIsCustomCompareSelected(false); // Reset custom selection when preset is chosen
        if (range.start) {
          const startMonth = startOfMonth(range.start);
          setCurrentMonth1(startMonth);
          setCurrentMonth2(startMonth.add({ months: 1 }));
        }
      }
    } else {
      // Handle main date range preset
      setActivePreset(preset.label);
      const range = preset.getRange();
      if (range) {
        setTempDateRange(range);
        if (range.start) {
          const startMonth = startOfMonth(range.start);
          setCurrentMonth1(startMonth);
          setCurrentMonth2(startMonth.add({ months: 1 }));
        }
      }
    }
  };

  const handleHolidayClick = (holiday: HolidayWithDate): void => {
    setSelectedHoliday(holiday);

    const start = parseToCalendarDate(holiday.start_date);
    const end = parseToCalendarDate(holiday.end_date);

    setTempDateRange({ start, end });

    const startMonth = startOfMonth(start);
    setCurrentMonth1(startMonth);
    setCurrentMonth2(startMonth.add({ months: 1 }));
  };

  const handleDateClick = (date: CalendarDate, calendarIndex: number): void => {
    if (selectingCompare && compareEnabled) {
      // Selecting compare range - only allow if custom is selected
      if (!isCustomCompareSelected) {
        return; // Don't allow date selection unless custom compare is selected
      }
      if (!tempCompareRange || !tempCompareRange.start) {
        // First click: set start date, auto-set end to same date
        setTempCompareRange({ start: date, end: date });
      } else if (tempCompareRange.start && tempCompareRange.end) {
        // Both dates exist - check if they're the same (auto-set end)
        if (tempCompareRange.start.compare(tempCompareRange.end) === 0) {
          // End was auto-set, so change end date only
          if (date.compare(tempCompareRange.start) < 0) {
            setTempCompareRange({ start: date, end: tempCompareRange.start });
          } else {
            setTempCompareRange({ start: tempCompareRange.start, end: date });
          }
        } else {
          // End was manually set, start new selection
          setTempCompareRange({ start: date, end: date });
        }
      }
    } else {
      // Selecting main date range
      if (!tempDateRange || !tempDateRange.start) {
        // First click: set start date, auto-set end to same date
        setTempDateRange({ start: date, end: date });
      } else if (tempDateRange.start && tempDateRange.end) {
        // Both dates exist - check if they're the same (auto-set end)
        if (tempDateRange.start.compare(tempDateRange.end) === 0) {
          // End was auto-set, so change end date only
          if (date.compare(tempDateRange.start) < 0) {
            setTempDateRange({ start: date, end: tempDateRange.start });
          } else {
            setTempDateRange({ start: tempDateRange.start, end: date });
          }
        } else {
          // End was manually set, start new selection
          setTempDateRange({ start: date, end: date });
        }
      }
    }
  };

  const navigateMonth = (direction: number, calendarIndex: number): void => {
    const currentDate = today(getLocalTimeZone());
    const minAllowedDate = currentDate.subtract({ years: maxPastYears });

    if (calendarIndex === 0) {
      const newMonth1 = currentMonth1.add({ months: direction });

      // Check if navigating backwards and would go beyond maxPastYears limit
      if (direction < 0 && newMonth1.compare(startOfMonth(minAllowedDate)) < 0) {
        return; // Don't navigate beyond the limit
      }

      setCurrentMonth1(newMonth1);
      setCurrentMonth2(newMonth1.add({ months: 1 }));
    } else {
      const newMonth2 = currentMonth2.add({ months: direction });

      // Check if navigating backwards and would go beyond maxPastYears limit
      if (direction < 0 && newMonth2.compare(startOfMonth(minAllowedDate)) < 0) {
        return; // Don't navigate beyond the limit
      }

      setCurrentMonth2(newMonth2);
      setCurrentMonth1(newMonth2.subtract({ months: 1 }));
    }
  };

  // Check if previous navigation should be disabled for a calendar
  const isPreviousDisabled = (calendarIndex: number): boolean => {
    const currentDate = today(getLocalTimeZone());
    const minAllowedDate = currentDate.subtract({ years: maxPastYears });
    const minAllowedMonth = startOfMonth(minAllowedDate);

    if (calendarIndex === 0) {
      return currentMonth1.compare(minAllowedMonth) <= 0;
    } else {
      return currentMonth2.compare(minAllowedMonth) <= 0;
    }
  };

  const formatDateRange = (range: DateRange | null): string => {
    if (!range || !range.start) return "";
    if (!range.end) return formatDate(range.start);
    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  };

  const formatDate = (date: CalendarDate | null): string => {
    if (!date) return "";

    const mm = String(date.month).padStart(2, "0");
    const dd = String(date.day).padStart(2, "0");
    const yyyy = date.year;

    return `${mm}/${dd}/${yyyy}`;
  };


  const renderCalendar = (month: CalendarDate, calendarIndex: number): React.ReactElement => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const startWeek = startOfWeek(start, 'en-US');
    const endWeek = endOfWeek(end, 'en-US');

    const days: CalendarDate[] = [];
    let current = startWeek;
    const activeRange = selectingCompare && compareEnabled ? tempCompareRange : tempDateRange;

    // Other range (for comparison display) - only show if not currently selecting that range
    const showOtherRange = compareEnabled && selectingCompare;
    const otherRange = showOtherRange ? tempCompareRange : null;

    while (current.compare(endWeek) <= 0) {
      days.push(current);
      current = current.add({ days: 1 });
    }

    const monthName = new Date(month.year, month.month - 1, month.day).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Box className="main-calendar-container">
        <Box className="calendar-header">
          <IconButton
            size="small"
            onClick={() => navigateMonth(-1, calendarIndex)}
            disabled={isPreviousDisabled(calendarIndex)}
            className="calendar-nav-button"
          >
            <ChevronLeft />
          </IconButton>
          <Typography variant="body1" className="calendar-month-name">
            {monthName}
          </Typography>
          <IconButton
            size="small"
            onClick={() => navigateMonth(1, calendarIndex)}
            className="calendar-nav-button"
          >
            <ChevronRight />
          </IconButton>
        </Box>
        <Box className="calendar-grid">
          {weekDays.map(day => (
            <Box key={day} className="calendar-weekday">
              {day}
            </Box>
          ))}
          {days.map((date, idx) => {
            const isCurrentMonth = date.month === month.month;

            // Active range (the one being selected)
            const isActiveSelected = activeRange && activeRange.start && isSameDate(date, activeRange.start);
            const isActiveEndSelected = activeRange && activeRange.end && isSameDate(date, activeRange.end);
            const isActiveInRange = activeRange && activeRange.start && activeRange.end &&
              date.compare(activeRange.start) >= 0 && date.compare(activeRange.end) <= 0;

            // Other range (for comparison display)
            const isOtherInRange = showOtherRange && otherRange && otherRange.start && otherRange.end &&
              date.compare(otherRange.start) >= 0 && date.compare(otherRange.end) <= 0;
            const isOtherSelected = showOtherRange && otherRange && otherRange.start && isSameDate(date, otherRange.start);
            const isOtherEndSelected = showOtherRange && otherRange && otherRange.end && isSameDate(date, otherRange.end);

            const isHolidaySelected = !selectingCompare && selectedHoliday && selectedHoliday.date &&
              isSameDate(date, selectedHoliday.date);
            const isDisabled = isFutureDate(date);
            const isCompareModeDisabled = selectingCompare && compareEnabled && !isCustomCompareSelected;

            return (
              <Box
                key={idx}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isActiveSelected || isActiveEndSelected ? 'selected' : ''
                  } ${isActiveInRange ? 'in-range' : ''} ${isOtherInRange && !isActiveInRange ? 'compare-range' : ''
                  } ${isHolidaySelected ? 'holiday-selected' : ''} ${isDisabled || isCompareModeDisabled ? 'disabled-date' : ''}`}
                onClick={() => isCurrentMonth && !isDisabled && !isCompareModeDisabled && handleDateClick(date, calendarIndex)}
              >
                {date.day}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const isSameDate = (date1: CalendarDate | null | undefined, date2: CalendarDate | null | undefined): boolean => {
    if (!date1 || !date2) return false;

    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };


  const isFutureDate = (date: CalendarDate): boolean => {
    const maxDate = getMaxSelectableDate();
    return date.compare(maxDate) > 0;
  };

  const displayValue = formatDateRange(value);
  const displayCompareValue = formatDateRange(compareValue);

  return (
    <Box className="custom-date-picker-wrapper">
      <Box className="date-picker-trigger-container" ref={anchorRef}>
        <Box
          className={`date-picker-trigger-field ${(isOpen && !selectingCompare) ? 'active-trigger' : ''}`}
          onClick={() => handleOpen(false)}
        >
          <div className='d-flex'>
            <svg className="calendar-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.75 1.5C12.75 1.08579 12.4142 0.75 12 0.75C11.5858 0.75 11.25 1.08579 11.25 1.5H12H12.75ZM11.25 4.5C11.25 4.91421 11.5858 5.25 12 5.25C12.4142 5.25 12.75 4.91421 12.75 4.5H12H11.25ZM6.75 1.5C6.75 1.08579 6.41421 0.75 6 0.75C5.58579 0.75 5.25 1.08579 5.25 1.5H6H6.75ZM5.25 4.5C5.25 4.91421 5.58579 5.25 6 5.25C6.41421 5.25 6.75 4.91421 6.75 4.5H6H5.25ZM2.25 6.75C1.83579 6.75 1.5 7.08579 1.5 7.5C1.5 7.91421 1.83579 8.25 2.25 8.25V7.5V6.75ZM15.75 8.25C16.1642 8.25 16.5 7.91421 16.5 7.5C16.5 7.08579 16.1642 6.75 15.75 6.75V7.5V8.25ZM3.75 3V3.75H14.25V3V2.25H3.75V3ZM14.25 3V3.75C14.6642 3.75 15 4.08579 15 4.5H15.75H16.5C16.5 3.25736 15.4926 2.25 14.25 2.25V3ZM15.75 4.5H15V15H15.75H16.5V4.5H15.75ZM15.75 15H15C15 15.4142 14.6642 15.75 14.25 15.75V16.5V17.25C15.4926 17.25 16.5 16.2426 16.5 15H15.75ZM14.25 16.5V15.75H3.75V16.5V17.25H14.25V16.5ZM3.75 16.5V15.75C3.33579 15.75 3 15.4142 3 15H2.25H1.5C1.5 16.2426 2.50736 17.25 3.75 17.25V16.5ZM2.25 15H3V4.5H2.25H1.5V15H2.25ZM2.25 4.5H3C3 4.08579 3.33579 3.75 3.75 3.75V3V2.25C2.50736 2.25 1.5 3.25736 1.5 4.5H2.25ZM12 1.5H11.25V4.5H12H12.75V1.5H12ZM6 1.5H5.25V4.5H6H6.75V1.5H6ZM2.25 7.5V8.25H15.75V7.5V6.75H2.25V7.5Z" fill="#71717A" />
            </svg>
          </div>
          <span className={`date-display-text ${!displayValue ? 'placeholder-text' : ''}`}>
            {displayValue || placeholder}
          </span>
        </Box>

        {compareEnabled && <><span className="date-picker-trigger-field  vs-separator-trigger">Vs</span>
          <Box
            className={`date-picker-trigger-field ${(isOpen && selectingCompare) ? 'active-trigger' : ''}`}
            onClick={() => handleOpen(true)}
          >
            <div className='d-flex'>
              <svg className="calendar-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.75 1.5C12.75 1.08579 12.4142 0.75 12 0.75C11.5858 0.75 11.25 1.08579 11.25 1.5H12H12.75ZM11.25 4.5C11.25 4.91421 11.5858 5.25 12 5.25C12.4142 5.25 12.75 4.91421 12.75 4.5H12H11.25ZM6.75 1.5C6.75 1.08579 6.41421 0.75 6 0.75C5.58579 0.75 5.25 1.08579 5.25 1.5H6H6.75ZM5.25 4.5C5.25 4.91421 5.58579 5.25 6 5.25C6.41421 5.25 6.75 4.91421 6.75 4.5H6H5.25ZM2.25 6.75C1.83579 6.75 1.5 7.08579 1.5 7.5C1.5 7.91421 1.83579 8.25 2.25 8.25V7.5V6.75ZM15.75 8.25C16.1642 8.25 16.5 7.91421 16.5 7.5C16.5 7.08579 16.1642 6.75 15.75 6.75V7.5V8.25ZM3.75 3V3.75H14.25V3V2.25H3.75V3ZM14.25 3V3.75C14.6642 3.75 15 4.08579 15 4.5H15.75H16.5C16.5 3.25736 15.4926 2.25 14.25 2.25V3ZM15.75 4.5H15V15H15.75H16.5V4.5H15.75ZM15.75 15H15C15 15.4142 14.6642 15.75 14.25 15.75V16.5V17.25C15.4926 17.25 16.5 16.2426 16.5 15H15.75ZM14.25 16.5V15.75H3.75V16.5V17.25H14.25V16.5ZM3.75 16.5V15.75C3.33579 15.75 3 15.4142 3 15H2.25H1.5C1.5 16.2426 2.50736 17.25 3.75 17.25V16.5ZM2.25 15H3V4.5H2.25H1.5V15H2.25ZM2.25 4.5H3C3 4.08579 3.33579 3.75 3.75 3.75V3V2.25C2.50736 2.25 1.5 3.25736 1.5 4.5H2.25ZM12 1.5H11.25V4.5H12H12.75V1.5H12ZM6 1.5H5.25V4.5H6H6.75V1.5H6ZM2.25 7.5V8.25H15.75V7.5V6.75H2.25V7.5Z" fill="#71717A" />
              </svg>
            </div>
            <span className={`date-display-text ${!displayCompareValue ? 'placeholder-text' : ''}`}>
              {displayCompareValue || comparePlaceholder}
            </span>
          </Box></>}

      </Box>

      <Popper
        open={isOpen}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        ref={popperRef}
        className="date-picker-popper"
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Paper className="date-picker-modal" elevation={8}>
            <Box className="date-picker-content">
              {comparison && <Box className="date-picker-tabs">
                <Tabs value={activeTab} onChange={handleTabChange} className="custom-tabs">
                  <Tab label="Default" className="custom-tab" />
                  {!selectingCompare && <Tab label="Holiday" className="custom-tab" />}
                </Tabs>
                <Box className="compare-toggle-container">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={compareEnabled}
                        onChange={handleCompareToggle}
                        className="compare-switch"
                      />
                    }
                    label="Compare"
                    className="compare-label"
                  />
                </Box>
              </Box>}

              <Box className="date-picker-body">
                <Box className="date-picker-sidebar">
                  {activeTab === 0 ? (
                    <List className="preset-list">
                      {(selectingCompare && compareEnabled ? getCompareRanges() : predefinedRanges).map((preset, idx) => {
                        const rangeWeek = preset.getRange();
                        const isDisabledWeek = rangeWeek === null && !preset.isCustom;

                        return (
                          <ListItem key={idx} disablePadding>
                            <ListItemButton
                              disabled={isDisabledWeek}
                              onClick={() => !isDisabledWeek && handlePresetClick(preset)}
                              className={`preset-item
                              ${(!selectingCompare && activePreset === preset.label) ||
                                  (selectingCompare && activeComparePresetUI === preset.label)
                                  ? "active-preset"
                                  : ""
                                }`}
                            >
                              {preset.label}
                            </ListItemButton>
                          </ListItem>
                        )
                      })}
                    </List>
                  ) : (
                    <List className="holiday-list">
                      {holidays.map((holiday, idx) => (
                        <ListItem key={idx} disablePadding>
                          <ListItemButton
                            onClick={() => {
                              const holidayWithDates = holiday as unknown as HolidayWithDate;
                              if (holidayWithDates.start_date && holidayWithDates.end_date) {
                                handleHolidayClick(holidayWithDates);
                              }
                            }}
                            className={`holiday-item ${selectedHoliday?.name === holiday.name ? 'selected' : ''}`}
                          >
                            {holiday.name}
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                <Box className="date-picker-main">
                  <Box className="date-range-inputs">
                    <TextField
                      value={formatDateRange(tempDateRange)}
                      placeholder={placeholder}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <div className='d-flex'><svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.75 1.5C12.75 1.08579 12.4142 0.75 12 0.75C11.5858 0.75 11.25 1.08579 11.25 1.5H12H12.75ZM11.25 4.5C11.25 4.91421 11.5858 5.25 12 5.25C12.4142 5.25 12.75 4.91421 12.75 4.5H12H11.25ZM6.75 1.5C6.75 1.08579 6.41421 0.75 6 0.75C5.58579 0.75 5.25 1.08579 5.25 1.5H6H6.75ZM5.25 4.5C5.25 4.91421 5.58579 5.25 6 5.25C6.41421 5.25 6.75 4.91421 6.75 4.5H6H5.25ZM2.25 6.75C1.83579 6.75 1.5 7.08579 1.5 7.5C1.5 7.91421 1.83579 8.25 2.25 8.25V7.5V6.75ZM15.75 8.25C16.1642 8.25 16.5 7.91421 16.5 7.5C16.5 7.08579 16.1642 6.75 15.75 6.75V7.5V8.25ZM3.75 3V3.75H14.25V3V2.25H3.75V3ZM14.25 3V3.75C14.6642 3.75 15 4.08579 15 4.5H15.75H16.5C16.5 3.25736 15.4926 2.25 14.25 2.25V3ZM15.75 4.5H15V15H15.75H16.5V4.5H15.75ZM15.75 15H15C15 15.4142 14.6642 15.75 14.25 15.75V16.5V17.25C15.4926 17.25 16.5 16.2426 16.5 15H15.75ZM14.25 16.5V15.75H3.75V16.5V17.25H14.25V16.5ZM3.75 16.5V15.75C3.33579 15.75 3 15.4142 3 15H2.25H1.5C1.5 16.2426 2.50736 17.25 3.75 17.25V16.5ZM2.25 15H3V4.5H2.25H1.5V15H2.25ZM2.25 4.5H3C3 4.08579 3.33579 3.75 3.75 3.75V3V2.25C2.50736 2.25 1.5 3.25736 1.5 4.5H2.25ZM12 1.5H11.25V4.5H12H12.75V1.5H12ZM6 1.5H5.25V4.5H6H6.75V1.5H6ZM2.25 7.5V8.25H15.75V7.5V6.75H2.25V7.5Z" fill="#71717A" />
                        </svg></div>
                        ,
                      }}
                      className={`range-input-field ${!selectingCompare ? 'active-input' : ''}`}
                      onClick={() => {
                        setSelectingCompare(false);
                        setActiveTab(0);
                        if (tempDateRange && tempDateRange.start) {
                          const startMonth = startOfMonth(tempDateRange.start);
                          setCurrentMonth1(startMonth);
                          setCurrentMonth2(startMonth.add({ months: 1 }));
                        }
                      }}
                    />
                    {compareEnabled && (
                      <>
                        <span className="MuiFormControl-root vs-text">Vs</span>
                        <TextField
                          value={formatDateRange(tempCompareRange)}
                          placeholder={comparePlaceholder}
                          InputProps={{
                            readOnly: true,
                            startAdornment: <div className='d-flex'><svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12.75 1.5C12.75 1.08579 12.4142 0.75 12 0.75C11.5858 0.75 11.25 1.08579 11.25 1.5H12H12.75ZM11.25 4.5C11.25 4.91421 11.5858 5.25 12 5.25C12.4142 5.25 12.75 4.91421 12.75 4.5H12H11.25ZM6.75 1.5C6.75 1.08579 6.41421 0.75 6 0.75C5.58579 0.75 5.25 1.08579 5.25 1.5H6H6.75ZM5.25 4.5C5.25 4.91421 5.58579 5.25 6 5.25C6.41421 5.25 6.75 4.91421 6.75 4.5H6H5.25ZM2.25 6.75C1.83579 6.75 1.5 7.08579 1.5 7.5C1.5 7.91421 1.83579 8.25 2.25 8.25V7.5V6.75ZM15.75 8.25C16.1642 8.25 16.5 7.91421 16.5 7.5C16.5 7.08579 16.1642 6.75 15.75 6.75V7.5V8.25ZM3.75 3V3.75H14.25V3V2.25H3.75V3ZM14.25 3V3.75C14.6642 3.75 15 4.08579 15 4.5H15.75H16.5C16.5 3.25736 15.4926 2.25 14.25 2.25V3ZM15.75 4.5H15V15H15.75H16.5V4.5H15.75ZM15.75 15H15C15 15.4142 14.6642 15.75 14.25 15.75V16.5V17.25C15.4926 17.25 16.5 16.2426 16.5 15H15.75ZM14.25 16.5V15.75H3.75V16.5V17.25H14.25V16.5ZM3.75 16.5V15.75C3.33579 15.75 3 15.4142 3 15H2.25H1.5C1.5 16.2426 2.50736 17.25 3.75 17.25V16.5ZM2.25 15H3V4.5H2.25H1.5V15H2.25ZM2.25 4.5H3C3 4.08579 3.33579 3.75 3.75 3.75V3V2.25C2.50736 2.25 1.5 3.25736 1.5 4.5H2.25ZM12 1.5H11.25V4.5H12H12.75V1.5H12ZM6 1.5H5.25V4.5H6H6.75V1.5H6ZM2.25 7.5V8.25H15.75V7.5V6.75H2.25V7.5Z" fill="#71717A" />
                            </svg></div>,
                          }}
                          className={`range-input-field ${selectingCompare ? 'active-input' : ''}`}
                          onClick={() => {
                            setSelectingCompare(true);
                            setActiveTab(0);
                            if (tempCompareRange && tempCompareRange.start) {
                              const startMonth = startOfMonth(tempCompareRange.start);
                              setCurrentMonth1(startMonth);
                              setCurrentMonth2(startMonth.add({ months: 1 }));
                            } else if (tempDateRange && tempDateRange.start) {
                              // Show months around the date range for comparison
                              const startMonth = startOfMonth(tempDateRange.start);
                              setCurrentMonth1(startMonth);
                              setCurrentMonth2(startMonth.add({ months: 1 }));
                            }
                          }}
                        />
                      </>
                    )}
                  </Box>

                  <Box className="calendars-container">
                    {renderCalendar(currentMonth1, 0)}
                    {renderCalendar(currentMonth2, 1)}
                  </Box>
                  <Box className="date-picker-actions">
                    <Button onClick={handleCancel} className="cancel-button">
                      Cancel
                    </Button>
                    <Button onClick={handleApply} className="apply-button">
                      Apply
                    </Button>
                  </Box>
                </Box>
              </Box>

            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};

export default CustomDatePicker;

