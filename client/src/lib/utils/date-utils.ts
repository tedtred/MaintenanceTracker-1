import { 
  format as dateFormat, 
  parseISO, 
  isValid,
  addDays, 
  addWeeks, 
  addMonths,
  differenceInDays,
  differenceInCalendarDays,
  isPast,
  isToday,
  isFuture,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth
} from 'date-fns';

/**
 * Safely formats a date with error handling
 * 
 * @param date The date to format
 * @param formatString Format string (date-fns format)
 * @param fallback Fallback string if date is invalid
 * @returns Formatted date string
 */
export function safeFormat(
  date: Date | string | number | null | undefined,
  formatString: string = 'MMM dd, yyyy',
  fallback: string = 'Invalid date'
): string {
  if (!date) return fallback;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? dateFormat(dateObj, formatString) : fallback;
  } catch (error) {
    console.error("Error formatting date:", error);
    return fallback;
  }
}

/**
 * Safely parses a date string to a Date object
 * 
 * @param dateString The date string to parse
 * @param fallback Optional fallback date
 * @returns Parsed Date object or fallback
 */
export function safeParse(
  dateString: string | null | undefined,
  fallback: Date | null = null
): Date | null {
  if (!dateString) return fallback;
  
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : fallback;
  } catch (error) {
    console.error("Error parsing date:", error);
    return fallback;
  }
}

/**
 * Handle calendar date management based on frequency
 * 
 * @param date The starting date
 * @param frequency The frequency (DAILY, WEEKLY, etc.)
 * @returns The next date based on frequency
 */
export function getNextDate(date: Date, frequency: string): Date {
  const dateObj = new Date(date);
  
  switch (frequency) {
    case 'DAILY':
      return addDays(dateObj, 1);
    case 'WEEKLY':
      return addDays(dateObj, 7);
    case 'MONTHLY':
      return addMonths(dateObj, 1);
    case 'QUARTERLY':
      return addMonths(dateObj, 3);
    case 'SEMI_ANNUALLY':
      return addMonths(dateObj, 6);
    case 'YEARLY':
      return addMonths(dateObj, 12);
    default:
      return dateObj;
  }
}

/**
 * Safely compares two dates
 * 
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days difference or null if dates invalid
 */
export function safeDaysDifference(
  date1: Date | string | number | null | undefined,
  date2: Date | string | number | null | undefined
): number | null {
  if (!date1 || !date2) return null;
  
  try {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    
    if (!isValid(d1) || !isValid(d2)) return null;
    return differenceInCalendarDays(d1, d2);
  } catch (error) {
    console.error("Error calculating date difference:", error);
    return null;
  }
}

// Export other functions from date-fns for convenience
export {
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  isPast,
  isToday,
  isFuture,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth
};