/**
 * Timezone utility functions
 */

/**
 * Get formatted timestamp with timezone support
 * @param format - The format of the timestamp ('time', 'datetime', 'date')
 * @returns Formatted timestamp string
 */
export function getFormattedTimestamp(format: 'time' | 'datetime' | 'date' = 'time'): string {
  const now = new Date();
  const timeZone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    hour12: false,
  };

  switch (format) {
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
  }

  // Format the date according to the specified options
  const formatted = new Intl.DateTimeFormat('zh-CN', options).format(now);

  // Replace '/' with '-' for consistency
  return formatted.replace(/\//g, '-');
}

/**
 * Get current timezone
 * @returns Current timezone identifier
 */
export function getCurrentTimezone(): string {
  return process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
}