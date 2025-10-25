import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get today's date in YYYY-MM-DD format for a specific timezone
 * This ensures the display shows matches from "today" in the tournament's timezone,
 * not the browser's timezone
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get the date parts in the tournament's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Get the current day and time in a specific timezone
 * Returns day (0=Sunday), hour, and minutes for timezone-aware filtering
 */
export function getCurrentDayTimeInTimezone(timezone: string): { day: number; hours: number; minutes: number; totalMinutes: number } {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get the time parts in the tournament's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value || 'Sun';
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  
  // Convert weekday string to day number (0=Sunday, 1=Monday, etc.)
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const day = dayMap[weekday] || 0;
  
  // Calculate total minutes from midnight
  const totalMinutes = hours * 60 + minutes;
  
  return { day, hours, minutes, totalMinutes };
}
