// Shared real-world (Gregorian) date validation. Canonical stored form is ISO "YYYY-MM-DD".

const ISO_REAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidRealDate(value) {
    if (typeof value !== 'string') return false;

    const match = ISO_REAL_DATE_PATTERN.exec(value);
    if (!match) return false;

    const [, yearStr, monthStr, dayStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (month < 1 || month > 12) return false;

    // Roundtrip through Date to reject e.g. Feb 30.
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

module.exports = { isValidRealDate };
