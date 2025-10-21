/**
 * Timezone utilities for handling date/time operations across different timezones
 * 
 * Strategy:
 * - All dates stored in DB are in UTC (timestamp columns)
 * - Each tournament has a timezone (IANA format: "America/Santiago", "America/Mexico_City", etc.)
 * - When displaying dates: convert from UTC to tournament timezone
 * - When creating scheduled matches: interpret planned times in tournament timezone
 * - Timeout processor: calculate timeouts using tournament timezone
 */

/**
 * Converts a date to a specific timezone and returns date components
 * @param date - The date to convert (UTC)
 * @param timezone - IANA timezone string (e.g., "America/Santiago")
 * @returns Object with year, month (0-indexed), day, hours, minutes in the target timezone
 */
export function toTimezone(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  // Use Intl.DateTimeFormat to get date components in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  return {
    year: getValue('year'),
    month: getValue('month') - 1, // 0-indexed for JS Date
    day: getValue('day'),
    hours: getValue('hour'),
    minutes: getValue('minute'),
    seconds: getValue('second'),
  };
}

/**
 * Creates a Date object from date + time components in a specific timezone
 * Returns the equivalent UTC Date
 * 
 * @param year - Year in target timezone
 * @param month - Month (0-indexed) in target timezone
 * @param day - Day of month in target timezone
 * @param hours - Hours in target timezone
 * @param minutes - Minutes in target timezone
 * @param timezone - IANA timezone string
 * @returns Date object (in UTC) representing that moment in the target timezone
 */
export function fromTimezone(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timezone: string
): Date {
  // Create ISO string in the format YYYY-MM-DDTHH:MM:SS
  // Month needs to be 1-indexed for the string
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  
  const dateStr = `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00`;
  
  // Strategy: Use Date.parse with the timezone formatter to find the UTC equivalent
  // Start with a guess (midnight UTC on the target date)
  const guessDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  
  // Format this guess in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Get the offset by comparing UTC midnight to what the timezone shows
  const parts = formatter.formatToParts(guessDate);
  const getValue = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  const guessYear = getValue('year');
  const guessMonth = getValue('month') - 1;
  const guessDay = getValue('day');
  const guessHour = getValue('hour');
  const guessMinute = getValue('minute');
  
  // Calculate the offset: difference between UTC time and displayed local time
  const utcMs = guessDate.getTime();
  const displayedMs = Date.UTC(guessYear, guessMonth, guessDay, guessHour, guessMinute, 0);
  const offsetMs = utcMs - displayedMs;
  
  // Now create the target time: input local time converted to UTC using the offset
  const targetLocalMs = Date.UTC(year, month, day, hours, minutes, 0);
  const targetUtcMs = targetLocalMs + offsetMs;
  
  return new Date(targetUtcMs);
}

/**
 * Gets the current time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Date object representing current moment (in UTC)
 */
export function nowInTimezone(timezone: string): Date {
  return new Date(); // Current time is always in UTC, no conversion needed
}

/**
 * Formats a Date to a readable string in a specific timezone
 * @param date - Date to format (UTC)
 * @param timezone - IANA timezone string
 * @returns Formatted string like "19/10/2025 14:30:00"
 */
export function formatInTimezone(date: Date, timezone: string, includeTime = true): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }
  
  return new Intl.DateTimeFormat('es-CL', options).format(date);
}

/**
 * Combines a date (day) with a time string (HH:MM) in a specific timezone
 * @param dayDate - The date representing the day (any time component is ignored)
 * @param timeString - Time in format "HH:MM" (e.g., "14:30")
 * @param timezone - IANA timezone string
 * @returns Date object (in UTC) for that day+time in the timezone
 */
export function combineDateTimeInTimezone(
  dayDate: Date,
  timeString: string,
  timezone: string
): Date {
  // IMPORTANT: Extract only the DATE part (ignore time) from dayDate
  // This ensures we always use the correct date regardless of what time is stored in the DB
  // Get the date string in ISO format (YYYY-MM-DD)
  const dateStr = dayDate.toISOString().slice(0, 10); // "2025-10-20"
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Parse time string
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Combine and convert back to UTC
  // month is 1-indexed in the string, but fromTimezone expects 0-indexed
  return fromTimezone(
    year,
    month - 1,
    day,
    hours,
    minutes,
    timezone
  );
}
