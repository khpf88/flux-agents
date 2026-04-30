/**
 * Timezone Utility
 * Normalizes UTC dates to business timezone for user-facing output.
 */
export function formatToBusinessTimezone(utcDate: string | Date, timezone: string): string {
  const date = new Date(utcDate);
  return date.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
