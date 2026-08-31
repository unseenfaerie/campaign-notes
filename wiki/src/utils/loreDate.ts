// Pure helpers for encoding/decoding/formatting canonical lore-date strings on the frontend.
// Mirrors the server-side logic in common/dateSystem.js but operates on the plain-JSON
// era/calendar data served by GET /api/meta (see metaService.ts getDateSystem()).

export type LoreDateEra = {
    id: string
    order: number
    name: string
    durationYears: number | null
}

export type LoreDateMonth = {
    name: string
    days: number
}

export type LoreDateCalendar = {
    id: string
    eraId: string
    name: string
    months: LoreDateMonth[]
}

export type DateSystem = {
    daysPerYear: number
    eras: LoreDateEra[]
    calendars: LoreDateCalendar[]
}

export type DecodedLoreDate = {
    era: LoreDateEra
    year: number
    calendar: LoreDateCalendar
    monthIndex: number
    day: number
    monthName: string
}

const CANONICAL_PATTERN = /^(\d{2})(\d{5})(\d{3})_(.+)$/

export function getCalendarsForEra(dateSystem: DateSystem, eraId: string): LoreDateCalendar[] {
    return dateSystem.calendars.filter((calendar) => calendar.eraId === eraId)
}

export function monthDayFromDayOfYear(
    calendar: LoreDateCalendar,
    dayOfYear: number
): { monthIndex: number; day: number; monthName: string } {
    let remaining = dayOfYear
    for (let monthIndex = 0; monthIndex < calendar.months.length; monthIndex += 1) {
        const month = calendar.months[monthIndex]
        if (remaining <= month.days) {
            return { monthIndex, day: remaining, monthName: month.name }
        }
        remaining -= month.days
    }

    throw new Error(`Unable to resolve day-of-year ${dayOfYear} for calendar ${calendar.id}`)
}

export function dayOfYearFromMonthDay(calendar: LoreDateCalendar, monthIndex: number, day: number): number {
    const month = calendar.months[monthIndex]
    if (!month) {
        throw new Error(`Invalid month index ${monthIndex} for calendar ${calendar.id}`)
    }
    if (!Number.isInteger(day) || day < 1 || day > month.days) {
        throw new Error(`Invalid day ${day} for month ${month.name} in calendar ${calendar.id}`)
    }

    let dayOfYear = day
    for (let i = 0; i < monthIndex; i += 1) {
        dayOfYear += calendar.months[i].days
    }
    return dayOfYear
}

export function encodeLoreDate(
    dateSystem: DateSystem,
    { eraId, year, calendarId, monthIndex, day }: { eraId: string; year: number; calendarId: string; monthIndex: number; day: number }
): string {
    const era = dateSystem.eras.find((candidate) => candidate.id === eraId)
    const calendar = dateSystem.calendars.find((candidate) => candidate.id === calendarId)
    if (!era || !calendar || calendar.eraId !== eraId) {
        throw new Error(`Invalid era/calendar combination: ${eraId}/${calendarId}`)
    }

    const dayOfYear = dayOfYearFromMonthDay(calendar, monthIndex, day)

    const eraPart = String(era.order).padStart(2, '0')
    const yearPart = String(year).padStart(5, '0')
    const dayPart = String(dayOfYear).padStart(3, '0')

    return `${eraPart}${yearPart}${dayPart}_${calendarId}`
}

export function decodeLoreDate(dateSystem: DateSystem, value: string): DecodedLoreDate | null {
    const match = CANONICAL_PATTERN.exec(value)
    if (!match) {
        return null
    }

    const [, eraOrderStr, yearStr, dayOfYearStr, calendarId] = match
    const era = dateSystem.eras.find((candidate) => candidate.order === Number(eraOrderStr))
    const calendar = dateSystem.calendars.find((candidate) => candidate.id === calendarId)
    if (!era || !calendar || calendar.eraId !== era.id) {
        return null
    }

    try {
        const { monthIndex, day, monthName } = monthDayFromDayOfYear(calendar, Number(dayOfYearStr))
        return { era, year: Number(yearStr), calendar, monthIndex, day, monthName }
    } catch {
        return null
    }
}

export function isCanonicalLoreDate(value: unknown): value is string {
    return typeof value === 'string' && CANONICAL_PATTERN.test(value)
}

export function formatLoreDate(dateSystem: DateSystem, value: string): string {
    const decoded = decodeLoreDate(dateSystem, value)
    if (!decoded) {
        return value
    }
    return `${decoded.day} ${decoded.monthName}, Year ${decoded.year} of the ${decoded.era.name}`
}
