// Shared lore-date system: eras and calendars are the source of truth for in-world dates.
// Canonical stored/compared form is a fixed-width sortable string: "EEYYYYYDDD_calendarId"
//   EE   = 2-digit era order (chronological index into ERAS)
//   YYYYY = 5-digit year, 1-based within its era
//   DDD  = 3-digit day-of-year (1..DAYS_PER_YEAR)
// Because the numeric prefix is fixed-width, plain string comparison already sorts
// canonical values into correct chronological order across eras and calendars.

const DAYS_PER_YEAR = 336;

const ERAS = [
    { id: 'age-of-elves', order: 0, name: 'Age of Elves' },
    { id: 'age-of-ascension', order: 1, name: 'Age of Ascension' },
    { id: 'age-of-descent', order: 2, name: 'Age of Descent' },
    { id: 'age-of-light', order: 3, name: 'Age of Light' },
];

function genericMonths() {
    const months = [];
    for (let i = 1; i <= 12; i += 1) {
        months.push({ name: `Month ${i}`, days: 28 });
    }
    return months;
}

const REAL_WORLD_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const ACHIEL_SAINT_MONTHS = [
    { name: 'Vodardas', days: 30 },
    { name: 'Leofeden', days: 31 },
    { name: 'Dalvardas', days: 29 },
    { name: 'Odomaden', days: 31 },
    { name: 'Anyadas', days: 30 },
    { name: 'Dalvarden', days: 31 },
    { name: 'Sorendas', days: 30 },
    { name: 'Hammythden', days: 31 },
    { name: 'Illiadas', days: 30 },
    { name: 'Nevylden', days: 31 },
    { name: 'Laciandas', days: 30 },
    { name: 'Feast Days', days: 2 }
];

const CALENDARS = {
    'age-of-elves-default': {
        id: 'age-of-elves-default',
        eraId: 'age-of-elves',
        name: 'Default Calendar',
        months: REAL_WORLD_MONTH_NAMES.map((name) => ({ name, days: 28 })),
    },
    'age-of-ascension-default': {
        id: 'age-of-ascension-default',
        eraId: 'age-of-ascension',
        name: 'Default Calendar',
        months: REAL_WORLD_MONTH_NAMES.map((name) => ({ name, days: 28 })),
    },
    'age-of-descent-default': {
        id: 'age-of-descent-default',
        eraId: 'age-of-descent',
        name: 'Common Calendar',
        months: REAL_WORLD_MONTH_NAMES.map((name) => ({ name, days: 28 })),
    },
    'age-of-light-default': {
        id: 'age-of-light-default',
        eraId: 'age-of-light',
        name: 'Calendar of Saints',
        months: ACHIEL_SAINT_MONTHS,
    },
};

// Guard against misconfigured calendars as new eras/calendars are added.
for (const calendar of Object.values(CALENDARS)) {
    const total = calendar.months.reduce((sum, month) => sum + month.days, 0);
    if (total !== DAYS_PER_YEAR) {
        throw new Error(
            `Calendar ${calendar.id} months sum to ${total}, expected ${DAYS_PER_YEAR}`
        );
    }
    if (!ERAS.some((era) => era.id === calendar.eraId)) {
        throw new Error(`Calendar ${calendar.id} references unknown era: ${calendar.eraId}`);
    }
}

function getEra(eraId) {
    return ERAS.find((era) => era.id === eraId) || null;
}

function getEraByOrder(order) {
    return ERAS.find((era) => era.order === order) || null;
}

function getCalendar(calendarId) {
    return CALENDARS[calendarId] || null;
}

function getCalendarsForEra(eraId) {
    return Object.values(CALENDARS).filter((calendar) => calendar.eraId === eraId);
}

function dayOfYearFromMonthDay(calendarId, monthIndex, day) {
    const calendar = getCalendar(calendarId);
    if (!calendar) {
        throw new Error(`Unknown calendar: ${calendarId}`);
    }

    const month = calendar.months[monthIndex];
    if (!month) {
        throw new Error(`Invalid month index ${monthIndex} for calendar ${calendarId}`);
    }

    if (!Number.isInteger(day) || day < 1 || day > month.days) {
        throw new Error(`Invalid day ${day} for month ${month.name} in calendar ${calendarId}`);
    }

    let dayOfYear = day;
    for (let i = 0; i < monthIndex; i += 1) {
        dayOfYear += calendar.months[i].days;
    }

    return dayOfYear;
}

function monthDayFromDayOfYear(calendarId, dayOfYear) {
    const calendar = getCalendar(calendarId);
    if (!calendar) {
        throw new Error(`Unknown calendar: ${calendarId}`);
    }

    if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > DAYS_PER_YEAR) {
        throw new Error(`Invalid day-of-year ${dayOfYear} for calendar ${calendarId}`);
    }

    let remaining = dayOfYear;
    for (let monthIndex = 0; monthIndex < calendar.months.length; monthIndex += 1) {
        const month = calendar.months[monthIndex];
        if (remaining <= month.days) {
            return { monthIndex, day: remaining, monthName: month.name };
        }
        remaining -= month.days;
    }

    throw new Error(`Unable to resolve day-of-year ${dayOfYear} for calendar ${calendarId}`);
}

function encodeLoreDate({ eraId, year, calendarId, monthIndex, day }) {
    const era = getEra(eraId);
    if (!era) {
        throw new Error(`Unknown era: ${eraId}`);
    }

    const calendar = getCalendar(calendarId);
    if (!calendar || calendar.eraId !== eraId) {
        throw new Error(`Calendar ${calendarId} is not valid for era ${eraId}`);
    }

    if (!Number.isInteger(year) || year < 1 || year > 99999) {
        throw new Error(`Invalid year: ${year}`);
    }

    const dayOfYear = dayOfYearFromMonthDay(calendarId, monthIndex, day);

    const eraPart = String(era.order).padStart(2, '0');
    const yearPart = String(year).padStart(5, '0');
    const dayPart = String(dayOfYear).padStart(3, '0');

    return `${eraPart}${yearPart}${dayPart}_${calendarId}`;
}

const CANONICAL_PATTERN = /^(\d{2})(\d{5})(\d{3})_(.+)$/;

function decodeLoreDate(value) {
    if (typeof value !== 'string') {
        throw new Error(`Invalid lore date value: ${value}`);
    }

    const match = CANONICAL_PATTERN.exec(value);
    if (!match) {
        throw new Error(`Invalid lore date value: ${value}`);
    }

    const [, eraOrderStr, yearStr, dayOfYearStr, calendarId] = match;
    const era = getEraByOrder(Number(eraOrderStr));
    const calendar = getCalendar(calendarId);
    if (!era || !calendar || calendar.eraId !== era.id) {
        throw new Error(`Invalid lore date value: ${value}`);
    }

    const year = Number(yearStr);
    const dayOfYear = Number(dayOfYearStr);
    const { monthIndex, day, monthName } = monthDayFromDayOfYear(calendarId, dayOfYear);

    return { eraId: era.id, era, year, dayOfYear, calendarId, calendar, monthIndex, day, monthName };
}

function isValidLoreDate(value) {
    try {
        decodeLoreDate(value);
        return true;
    } catch {
        return false;
    }
}

function compareLoreDates(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function formatLoreDate(value) {
    const { day, monthName, year, era } = decodeLoreDate(value);
    return `${day} ${monthName}, Year ${year} of the ${era.name}`;
}

module.exports = {
    DAYS_PER_YEAR,
    ERAS,
    CALENDARS,
    getEra,
    getEraByOrder,
    getCalendar,
    getCalendarsForEra,
    dayOfYearFromMonthDay,
    monthDayFromDayOfYear,
    encodeLoreDate,
    decodeLoreDate,
    isValidLoreDate,
    compareLoreDates,
    formatLoreDate,
};
