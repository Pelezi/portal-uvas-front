import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { authService } from '@/services/authService';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/en';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default locale to pt-BR, or use user's locale when available
const _setLocale = () => {
  try {
    const user = authService.getCurrentUser();
    const userLocale = user?.locale as string | undefined;
    if (userLocale) {
      const normalized = userLocale.toLowerCase().replace('_', '-');
      // dayjs uses 'pt-br' for Brazilian Portuguese
      if (normalized.startsWith('pt')) {
        dayjs.locale('pt-br');
        return;
      }
      if (normalized.startsWith('en')) {
        dayjs.locale('en');
        return;
      }
    }
  } catch (e) {
    // ignore
  }
  dayjs.locale('pt-br');
};

_setLocale();

/**
 * Get the user's configured timezone from localStorage
 * @returns User's timezone or 'UTC' as default
 */
export const getUserTimezone = (): string => {
  const user = authService.getCurrentUser();
  return user?.timezone || 'UTC';
};

/**
 * Convert a date string to the user's timezone
 * @param dateString ISO date string
 * @returns Dayjs object in user's timezone
 */
export const toUserTimezone = (dateString: string) => {
  const userTz = getUserTimezone();
  return dayjs(dateString).tz(userTz);
};

/**
 * Format a date string to user's timezone for display
 * @param dateString ISO date string
 * @param format Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted date string
 */
export const formatInUserTimezone = (dateString: string, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  return toUserTimezone(dateString).format(format);
};

/**
 * Get current date/time in user's timezone
 * @returns Dayjs object in user's timezone
 */
export const nowInUserTimezone = () => {
  const userTz = getUserTimezone();
  return dayjs().tz(userTz);
};

/**
 * Convert a local date/time to UTC for sending to API
 * @param date Dayjs object in user's local timezone
 * @returns ISO string in UTC
 */
export const toUTC = (date: dayjs.Dayjs): string => {
  return date.utc().toISOString();
};

/**
 * Create a Dayjs object in user's timezone
 * @param date Date string or Date object
 * @returns Dayjs object in user's timezone
 */
export const createInUserTimezone = (date?: string | Date | dayjs.Dayjs) => {
  const userTz = getUserTimezone();
  if (!date) {
    return dayjs().tz(userTz);
  }
  return dayjs(date).tz(userTz);
};
