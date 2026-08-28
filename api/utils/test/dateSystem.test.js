const {
    DAYS_PER_YEAR,
    ERAS,
    CALENDARS,
    encodeLoreDate,
    decodeLoreDate,
    isValidLoreDate,
    compareLoreDates,
    formatLoreDate,
} = require('../../../common/dateSystem');

describe('dateSystem', () => {
    it('every calendar months sum to DAYS_PER_YEAR', () => {
        for (const calendar of Object.values(CALENDARS)) {
            const total = calendar.months.reduce((sum, month) => sum + month.days, 0);
            expect(total).toBe(DAYS_PER_YEAR);
        }
    });

    it('every calendar references a known era', () => {
        for (const calendar of Object.values(CALENDARS)) {
            expect(ERAS.some((era) => era.id === calendar.eraId)).toBe(true);
        }
    });

    it('encodes and decodes a lore date round-trip', () => {
        const encoded = encodeLoreDate({
            eraId: 'age-of-descent',
            year: 200,
            calendarId: 'age-of-descent-default',
            monthIndex: 0,
            day: 1,
        });

        const decoded = decodeLoreDate(encoded);
        expect(decoded).toMatchObject({
            eraId: 'age-of-descent',
            year: 200,
            calendarId: 'age-of-descent-default',
            monthIndex: 0,
            day: 1,
            monthName: 'January',
        });
    });

    it('rejects an out-of-range day for a given month', () => {
        expect(() =>
            encodeLoreDate({
                eraId: 'age-of-descent',
                year: 1,
                calendarId: 'age-of-descent-default',
                monthIndex: 0,
                day: 29,
            })
        ).toThrow();
    });

    it('rejects a calendar that does not belong to the given era', () => {
        expect(() =>
            encodeLoreDate({
                eraId: 'age-of-elves',
                year: 1,
                calendarId: 'age-of-descent-default',
                monthIndex: 0,
                day: 1,
            })
        ).toThrow();
    });

    it('validates canonical lore date strings', () => {
        const valid = encodeLoreDate({
            eraId: 'age-of-descent',
            year: 5,
            calendarId: 'age-of-descent-default',
            monthIndex: 2,
            day: 10,
        });

        expect(isValidLoreDate(valid)).toBe(true);
        expect(isValidLoreDate('not-a-date')).toBe(false);
        expect(isValidLoreDate('jan-01-200')).toBe(false);
    });

    it('compares dates within the same era/calendar chronologically', () => {
        const earlier = encodeLoreDate({
            eraId: 'age-of-descent',
            year: 10,
            calendarId: 'age-of-descent-default',
            monthIndex: 0,
            day: 1,
        });
        const later = encodeLoreDate({
            eraId: 'age-of-descent',
            year: 10,
            calendarId: 'age-of-descent-default',
            monthIndex: 0,
            day: 2,
        });

        expect(compareLoreDates(earlier, later)).toBeLessThan(0);
        expect(compareLoreDates(later, earlier)).toBeGreaterThan(0);
        expect(compareLoreDates(earlier, earlier)).toBe(0);
    });

    it('compares dates across eras chronologically regardless of year', () => {
        const laterEraEarlyYear = encodeLoreDate({
            eraId: 'age-of-achiel',
            year: 1,
            calendarId: 'age-of-achiel-default',
            monthIndex: 0,
            day: 1,
        });
        const earlierEraLateYear = encodeLoreDate({
            eraId: 'age-of-elves',
            year: 99999,
            calendarId: 'age-of-elves-default',
            monthIndex: 11,
            day: 28,
        });

        expect(compareLoreDates(earlierEraLateYear, laterEraEarlyYear)).toBeLessThan(0);
    });

    it('formats a lore date for display', () => {
        const encoded = encodeLoreDate({
            eraId: 'age-of-descent',
            year: 200,
            calendarId: 'age-of-descent-default',
            monthIndex: 9,
            day: 3,
        });

        expect(formatLoreDate(encoded)).toBe('3 October, Year 200 of the Age of Descent');
    });
});
