/**
 * Timezone Service
 * Manages user's timezone preference and provides timezone-aware date utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMEZONE_STORAGE_KEY = '@gharkharch:timezone';
const DEFAULT_TIMEZONE = 'Asia/Kolkata'; // IST

/**
 * Common timezones with their display names
 */
export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: '+05:30' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: '+04:00' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)', offset: '+08:00' },
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: '+10:00' },
] as const;

export type Timezone = typeof TIMEZONES[number]['value'];

/**
 * Get user's timezone preference
 */
export async function getTimezone(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(TIMEZONE_STORAGE_KEY);
    return stored || DEFAULT_TIMEZONE;
  } catch (error) {
    console.error('Error getting timezone:', error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Set user's timezone preference
 */
export async function setTimezone(timezone: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
  } catch (error) {
    console.error('Error setting timezone:', error);
    throw error;
  }
}

/**
 * Format date string (YYYY-MM-DD) to Date object in user's timezone
 * This ensures dates are interpreted in the user's local timezone, not UTC
 */
export async function parseDateInTimezone(dateStr: string): Promise<Date> {
  const timezone = await getTimezone();
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date in user's timezone by using local time
  // This avoids UTC conversion issues
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date;
}

/**
 * Format date to YYYY-MM-DD string in user's timezone
 */
export async function formatDateToISO(date: Date): Promise<string> {
  const timezone = await getTimezone();
  
  // Use Intl.DateTimeFormat to format in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date);
}

/**
 * Format date for comparison (YYYY-MM-DD) in user's timezone
 */
export async function formatDateForComparison(date: Date): Promise<string> {
  return formatDateToISO(date);
}

/**
 * Get current date in user's timezone (midnight)
 */
export async function getTodayInTimezone(): Promise<Date> {
  const timezone = await getTimezone();
  const now = new Date();
  
  // Get current date in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const dateStr = formatter.format(now);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  const today = new Date(year, month - 1, day, 0, 0, 0);
  return today;
}

/**
 * Set date to midnight in user's timezone
 * This ensures consistent date handling across the app
 */
export async function setMidnightInTimezone(date: Date): Promise<Date> {
  const timezone = await getTimezone();
  
  // Get date string in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const dateStr = formatter.format(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create new date at midnight in local time (which represents midnight in user's timezone)
  const midnightDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  return midnightDate;
}

/**
 * Set date to midnight in user's timezone (synchronous version using cached timezone)
 * Use this in render functions where async is not possible
 */
let cachedTimezone: string | null = null;

export async function initializeTimezoneCache(): Promise<void> {
  cachedTimezone = await getTimezone();
}

export function setMidnightInTimezoneSync(date: Date, timezone?: string): Date {
  const tz = timezone || cachedTimezone || DEFAULT_TIMEZONE;
  
  // Get date string in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const dateStr = formatter.format(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create new date at midnight in local time (which represents midnight in user's timezone)
  const midnightDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  return midnightDate;
}

/**
 * Get today in timezone (synchronous version using cached timezone)
 */
export function getTodayInTimezoneSync(timezone?: string): Date {
  const tz = timezone || cachedTimezone || DEFAULT_TIMEZONE;
  const now = new Date();
  
  // Get current date in user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const dateStr = formatter.format(now);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  const today = new Date(year, month - 1, day, 0, 0, 0, 0);
  return today;
}

/**
 * Create a date at midnight in user's timezone from a date string (YYYY-MM-DD)
 */
export async function createDateAtMidnightInTimezone(dateStr: string): Promise<Date> {
  const timezone = await getTimezone();
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date at midnight in local time (which represents midnight in user's timezone)
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date;
}

/**
 * Format date for display in user's timezone
 */
export async function formatDateForDisplay(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): Promise<string> {
  const timezone = await getTimezone();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const formatter = new Intl.DateTimeFormat('en-IN', {
    ...defaultOptions,
    ...options,
  });
  
  return formatter.format(date);
}
