// Display helpers for the finance pages. Like go_heavier/format.ts, each one
// turns a missing value into an em dash.
import { EM_DASH } from "../go_heavier/format"
import type { PaymentMethodKind, TimeOfDay } from "./api"

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" })
const GBP_WHOLE = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
})

function missing(value: number | null | undefined): value is null | undefined {
    return value === null || value === undefined || Number.isNaN(value)
}

// "£1,234.56"
export function formatGBP(value: number | null | undefined): string {
    return missing(value) ? EM_DASH : GBP.format(value)
}

// "£1,235", for totals where pence are noise.
export function formatGBPWhole(value: number | null | undefined): string {
    return missing(value) ? EM_DASH : GBP_WHOLE.format(value)
}

// "£1.2k", short enough for a chart axis.
export function formatGBPShort(value: number | null | undefined): string {
    if (missing(value)) {
        return EM_DASH
    }
    if (Math.abs(value) >= 1000) {
        return `£${(value / 1000).toFixed(1)}k`
    }
    return GBP_WHOLE.format(value)
}

// "+12%" / "-3%", or a dash when there was nothing to compare against.
export function formatChangePct(value: number | null | undefined): string {
    if (missing(value)) {
        return EM_DASH
    }
    const rounded = Math.round(value)
    return `${rounded > 0 ? "+" : ""}${rounded}%`
}

// The API's dates are plain "YYYY-MM-DD" days. new Date() would read one as
// UTC midnight, which is the previous evening anywhere west of Greenwich, so
// they're built from their parts in local time instead.
export function parseDay(value: string): Date {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
}

export function toDayString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function today(): string {
    return toDayString(new Date())
}

// "Sun, 15 Nov 2026"
export function formatDay(value: string | null | undefined): string {
    if (!value) {
        return EM_DASH
    }
    return parseDay(value).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    })
}

// "15 Nov"
export function formatDayShort(value: string | null | undefined): string {
    if (!value) {
        return EM_DASH
    }
    return parseDay(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// month is 1-12. "Nov"
export function monthShort(month: number): string {
    return MONTHS[month - 1] ?? EM_DASH
}

// "November 2026"
export function formatMonth(year: number, month: number): string {
    return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

// The first and last day of a month, for range filters.
export function monthRange(year: number, month: number): { after: string; before: string } {
    return {
        after: toDayString(new Date(year, month - 1, 1)),
        before: toDayString(new Date(year, month, 0))
    }
}

export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
    const date = new Date(year, month - 1 + by, 1)
    return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export const PAYMENT_METHOD_KINDS: { value: PaymentMethodKind; label: string }[] = [
    { value: "credit_card", label: "Credit card" },
    { value: "debit_card", label: "Debit card" },
    { value: "cash", label: "Cash" },
    { value: "shared_expense", label: "Shared expense" },
    { value: "transit_card", label: "Transit card" },
    { value: "other", label: "Other" }
]

export const TIMES_OF_DAY: { value: TimeOfDay; label: string }[] = [
    { value: "morning", label: "Morning" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
    { value: "night", label: "Night" },
    { value: "online", label: "Online" }
]

export function labelFor<T extends string>(options: { value: T; label: string }[], value: string | null): string {
    if (value === null) {
        return "Not recorded"
    }
    return options.find((option) => option.value === value)?.label ?? value
}

// "monday" -> "Mon"
export function weekdayShort(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1, 3)
}

// "1 spend" / "3 spends"
export function spends(count: number): string {
    return `${count.toLocaleString("en-GB")} ${count === 1 ? "spend" : "spends"}`
}

// "86%", or "<1%" for a share too small to round up to one.
export function formatShare(pct: number): string {
    return pct > 0 && pct < 1 ? "<1%" : `${Math.round(pct)}%`
}
