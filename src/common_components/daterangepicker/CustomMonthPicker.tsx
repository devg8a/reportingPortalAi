import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Popper,
  ClickAwayListener,
  Button,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { getLocalTimeZone, today, CalendarDate } from '@internationalized/date';
import './CustomMonthPicker.css';

interface CustomMonthPickerProps {
  value?: CalendarDate | "ALL_TIME" | null;
  onChange?: (value: CalendarDate | "ALL_TIME") => void;
  placeholder?: string;
  maxPastYears?: number;
  futureMonths?: number | "ALL";
}

const CustomMonthPicker: React.FC<CustomMonthPickerProps> = ({
  value = null,
  onChange = () => {},
  placeholder = "Select Month",
  maxPastYears = 3,
  futureMonths = 0
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentYear, setCurrentYear] = useState<number>(() => {
    if (value && value !== "ALL_TIME") {
      return value.year;
    }
    const now = today(getLocalTimeZone());
    return now.year;
  });
  const [selectedMonth, setSelectedMonth] = useState<CalendarDate | "ALL_TIME" | null>(value);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const now = today(getLocalTimeZone());
  const minYear = now.year - maxPastYears;
  const getMaxYear = () => {
    if (futureMonths === "ALL") {
      return now.year + 100; // practically unlimited
    }
  
    if (typeof futureMonths === "number" && futureMonths > 0) {
      const totalMonths = now.year * 12 + now.month + futureMonths;
      return Math.floor(totalMonths / 12);
    }
  
    return now.year; // default (no future)
  };
  
  const maxYear = getMaxYear();  

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  useEffect(() => {
    setSelectedMonth(value);
  
    if (value && value !== "ALL_TIME") {
      setCurrentYear(value.year);
    }
  }, [value]);
  

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };  

  const handleMonthClick = (monthIndex: number) => {
    const monthDate = new CalendarDate(currentYear, monthIndex + 1, 1);
    setSelectedMonth(monthDate);
    onChange(monthDate);
    setIsOpen(false);
  };

  const handleYearChange = (direction: number) => {
    setCurrentYear(prev => {
      const nextYear = prev + direction;
      if (nextYear < minYear || nextYear > maxYear) {
        return prev;
      }
      return nextYear;
    });
  };
  

  const handleAllTime = () => {
    setSelectedMonth("ALL_TIME");   // ✅
    onChange("ALL_TIME");
    setIsOpen(false);
  };
  

  const formatMonth = (monthDate: CalendarDate | "ALL_TIME" | null): string => {
    if (monthDate === "ALL_TIME") return "All time";
    if (!monthDate) return "";
  
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    return `${monthNames[monthDate.month - 1]} ${monthDate.year}`;
  };
  

  const displayValue = formatMonth(selectedMonth);

  const isMonthSelected = (monthIndex: number): boolean => {
    if (!selectedMonth || selectedMonth === "ALL_TIME") return false;
    return selectedMonth.year === currentYear && selectedMonth.month === monthIndex + 1;
  };

  const isMonthDisabled = (year: number, monthIndex: number): boolean => {
    const monthNumber = monthIndex + 1;
  
    // ALL future months enabled
    if (futureMonths === "ALL") return false;
  
    const currentYear = now.year;
    const currentMonth = now.month;
  
    const totalCurrentMonths = currentYear * 12 + currentMonth;
    const totalTargetMonths = year * 12 + monthNumber;
  
    // Default: future disabled
    if (!futureMonths || futureMonths === 0) {
      return totalTargetMonths > totalCurrentMonths;
    }
  
    // Limited future months
    return totalTargetMonths > totalCurrentMonths + futureMonths;
  };
  

  return (
    <Box className="custom-month-picker-wrapper">
      <Box 
        className={`month-picker-trigger-field ${isOpen ? 'active-trigger' : ''}`}
        onClick={handleOpen}
        ref={anchorRef}
      >
        <div className='d-flex'>
          <svg className="calendar-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.75 1.5C12.75 1.08579 12.4142 0.75 12 0.75C11.5858 0.75 11.25 1.08579 11.25 1.5H12H12.75ZM11.25 4.5C11.25 4.91421 11.5858 5.25 12 5.25C12.4142 5.25 12.75 4.91421 12.75 4.5H12H11.25ZM6.75 1.5C6.75 1.08579 6.41421 0.75 6 0.75C5.58579 0.75 5.25 1.08579 5.25 1.5H6H6.75ZM5.25 4.5C5.25 4.91421 5.58579 5.25 6 5.25C6.41421 5.25 6.75 4.91421 6.75 4.5H6H5.25ZM2.25 6.75C1.83579 6.75 1.5 7.08579 1.5 7.5C1.5 7.91421 1.83579 8.25 2.25 8.25V7.5V6.75ZM15.75 8.25C16.1642 8.25 16.5 7.91421 16.5 7.5C16.5 7.08579 16.1642 6.75 15.75 6.75V7.5V8.25ZM3.75 3V3.75H14.25V3V2.25H3.75V3ZM14.25 3V3.75C14.6642 3.75 15 4.08579 15 4.5H15.75H16.5C16.5 3.25736 15.4926 2.25 14.25 2.25V3ZM15.75 4.5H15V15H15.75H16.5V4.5H15.75ZM15.75 15H15C15 15.4142 14.6642 15.75 14.25 15.75V16.5V17.25C15.4926 17.25 16.5 16.2426 16.5 15H15.75ZM14.25 16.5V15.75H3.75V16.5V17.25H14.25V16.5ZM3.75 16.5V15.75C3.33579 15.75 3 15.4142 3 15H2.25H1.5C1.5 16.2426 2.50736 17.25 3.75 17.25V16.5ZM2.25 15H3V4.5H2.25H1.5V15H2.25ZM2.25 4.5H3C3 4.08579 3.33579 3.75 3.75 3.75V3V2.25C2.50736 2.25 1.5 3.25736 1.5 4.5H2.25ZM12 1.5H11.25V4.5H12H12.75V1.5H12ZM6 1.5H5.25V4.5H6H6.75V1.5H6ZM2.25 7.5V8.25H15.75V7.5V6.75H2.25V7.5Z" fill="#71717A"/>
          </svg>
        </div>
        <span className={`month-display-text ${!displayValue ? 'placeholder-text' : ''}`}>
          {displayValue || placeholder}
        </span>
      </Box>

      <Popper
        open={isOpen}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        ref={popperRef}
        className="month-picker-popper"
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleCancel}>
          <Paper className="month-picker-modal" elevation={8}>
            <Box className="month-picker-content">
              {/* Year Navigation */}
              <Box className="month-picker-header">
                <IconButton
                  size="small"
                  onClick={() => handleYearChange(-1)}
                  disabled={currentYear <= minYear}
                  className="year-nav-button"
                >
                  <ChevronLeft />
                </IconButton>
                <Typography variant="body1" className="year-display">
                  {currentYear}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleYearChange(1)}
                  disabled={currentYear >= maxYear}
                  className="year-nav-button"
                >
                  <ChevronRight />
                </IconButton>
              </Box>

              {/* Months Grid */}
              <Box className="months-grid">
                {months.map((month, index) => (
                  <Box
                    key={index}
                    className={`month-item 
                      ${isMonthSelected(index) ? 'selected-month' : ''} 
                      ${isMonthDisabled(currentYear, index) ? 'disabled-month' : ''}
                    `}                    
                    onClick={() => {
                      if (!isMonthDisabled(currentYear, index)) {
                        handleMonthClick(index);
                      }
                    }}                    
                  >
                    {month}
                  </Box>
                ))}
              </Box>

              {/* All Time Button */}
              <Box className="month-picker-actions">
                <Button 
                  onClick={handleAllTime} 
                  className="all-time-button"
                  fullWidth
                >
                  All time
                </Button>
              </Box>
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};

export default CustomMonthPicker;

