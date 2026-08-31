// Pure helpers for the real-world (Gregorian) date field type. Canonical stored/compared
// form is the ISO string "YYYY-MM-DD", which already sorts and displays in Year-Month-Day order.

export type DecodedRealDate = {
    year: number
    month: number // 1-12
    day: number
}

const ISO_REAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const REAL_WORLD_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

export function isCanonicalRealDate(value: unknown): value is string {
    return typeof value === 'string' && ISO_REAL_DATE_PATTERN.test(value)
}

export function decodeRealDate(value: string): DecodedRealDate | null {
    const match = ISO_REAL_DATE_PATTERN.exec(value)
    if (!match) {
        return null
    }

    const [, yearStr, monthStr, dayStr] = match
    return { year: Number(yearStr), month: Number(monthStr), day: Number(dayStr) }
}

export function encodeRealDate({ year, month, day }: DecodedRealDate): string {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

export function formatRealDate(value: string): string {
    const decoded = decodeRealDate(value)
    if (!decoded) {
        return value
    }
    return `${REAL_WORLD_MONTH_NAMES[decoded.month - 1]} ${decoded.day}, ${decoded.year}`
}
