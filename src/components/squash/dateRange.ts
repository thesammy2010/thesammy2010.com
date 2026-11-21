// Date ranges for filtering matches by when they're played, kept as the days
// a date input gives ("2026-11-20"), either end left open with "".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export interface DateRange {
    from: string
    to: string
}

// A day picked in a date input ("2026-11-20"), as the start or end of that
// day where the browser is, for the API's played-at bounds.
export function dayBound(day: string, end: boolean): string | undefined {
    if (!day) {
        return undefined
    }
    const [year, month, date] = day.split("-").map(Number)
    return end
        ? new Date(year, month - 1, date, 23, 59, 59, 999).toISOString()
        : new Date(year, month - 1, date).toISOString()
}

// A day as a date input has it, in local time
export function isoDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parse(day: string): Date {
    const [year, month, date] = day.split("-").map(Number)
    return new Date(year, month - 1, date)
}

// The ranges most looked for, ending today or covering the whole month or
// year, so arranged matches later on are in them too
export function presets(today: Date): (DateRange & { label: string })[] {
    const y = today.getFullYear()
    const m = today.getMonth()
    const daysAgo = (n: number) => isoDay(new Date(y, m, today.getDate() - n))
    return [
        { label: "Last 7 days", from: daysAgo(6), to: "" },
        { label: "Last 30 days", from: daysAgo(29), to: "" },
        { label: "This month", from: isoDay(new Date(y, m, 1)), to: isoDay(new Date(y, m + 1, 0)) },
        { label: "Last month", from: isoDay(new Date(y, m - 1, 1)), to: isoDay(new Date(y, m, 0)) },
        { label: "This year", from: isoDay(new Date(y, 0, 1)), to: isoDay(new Date(y, 11, 31)) }
    ]
}

/**
 * A range as briefly as it reads: "Any time", a preset's name, "3–15 Nov",
 * "28 Oct – 3 Nov", "Since 3 Nov" or "Until 15 Nov", with years only where
 * they aren't this one.
 */
export function rangeLabel({ from, to }: DateRange, today: Date): string {
    if (!from && !to) {
        return "Any time"
    }
    const preset = presets(today).find((p) => p.from === from && p.to === to)
    if (preset) {
        return preset.label
    }
    const thisYear = today.getFullYear()
    const day = (d: Date, withYear: boolean) =>
        `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`
    if (!to) {
        const start = parse(from)
        return `Since ${day(start, start.getFullYear() !== thisYear)}`
    }
    if (!from) {
        const end = parse(to)
        return `Until ${day(end, end.getFullYear() !== thisYear)}`
    }
    const start = parse(from)
    const end = parse(to)
    const sameYear = start.getFullYear() === end.getFullYear()
    const year = sameYear && end.getFullYear() !== thisYear ? ` ${end.getFullYear()}` : ""
    if (from === to) {
        return day(start, start.getFullYear() !== thisYear)
    }
    if (sameYear && start.getMonth() === end.getMonth()) {
        return `${start.getDate()}–${day(end, false)}${year}`
    }
    if (sameYear) {
        return `${day(start, false)} – ${day(end, false)}${year}`
    }
    return `${day(start, true)} – ${day(end, true)}`
}
