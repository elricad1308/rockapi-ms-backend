/**
 * Get a 'timestamp' from a date.
 * 
 * The timestamp is composed by the year, month, date, hour, minute
 * and second of the date, in the format
 * 
 * yyyymmddHHMMss
 * 
 * @param date a JavaScript date
 * 
 * @return a string with the date timestamp
 */
export function getTimestamp (date: Date): string {
  return date.toISOString().replace(/[^0-9]/g, '').slice(0, 14)
}