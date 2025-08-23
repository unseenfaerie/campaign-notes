function isValidDateFormat(date) {
  const isValid = typeof date === 'string' && /^[a-z]{3}-\d{2}-\d{3}$/i.test(date);
  return isValid;
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function parseLoreDate(date) {
  // Expects format mmm-dd-yyy
  if (!isValidDateFormat(date)) return null;
  const [month, day, year] = date.toLowerCase().split('-');
  return {
    year: parseInt(year, 10),
    month: MONTHS[month],
    day: parseInt(day, 10)
  };
}

// For sorting: convert to a sortable string or number
function loreDateToSortable(date) {
  const parsed = parseLoreDate(date);
  if (!parsed) return null;
  // Pad month and day for consistent sorting
  return `${parsed.year.toString().padStart(3, '0')}-${parsed.month.toString().padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`;
}

function sortLoreDates(dates) {
  return dates
    .filter(isValidDateFormat)
    .sort((a, b) => {
      const aKey = loreDateToSortable(a);
      const bKey = loreDateToSortable(b);
      if (!aKey && !bKey) return 0;
      if (!aKey) return 1;
      if (!bKey) return -1;
      return aKey.localeCompare(bKey);
    });
}

module.exports = { isValidDateFormat, parseLoreDate, loreDateToSortable, sortLoreDates };