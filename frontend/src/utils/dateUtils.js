// Utility functions for date formatting in the frontend

/**
 * Converts a date string like "feb-06-195" to "February 6th, 195".
 * @param {string} dateStr - The date string in the format "mon-dd-yyyy".
 * @returns {string} - The prettified date string.
 */
export function prettifyDate(dateStr) {
  if (!dateStr) return '';
  const monthMap = {
    jan: 'January', feb: 'February', mar: 'March', apr: 'April',
    may: 'May', jun: 'June', jul: 'July', aug: 'August',
    sep: 'September', oct: 'October', nov: 'November', dec: 'December'
  };
  const match = dateStr.match(/^(\w{3})-(\d{2})-(\d{3,4})$/i);
  if (!match) return dateStr;
  const [, mon, dd, yyyy] = match;
  const month = monthMap[mon.toLowerCase()] || mon;
  const day = parseInt(dd, 10);
  const year = yyyy;
  const daySuffix = (d) => {
    if (d >= 11 && d <= 13) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${month} ${day}${daySuffix(day)}, ${year}`;
}
