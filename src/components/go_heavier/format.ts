// Shared display formatting. Every helper takes a missing value and returns an
// em dash, so pages don't each have to guard nullable fields from the API.

export const EM_DASH = "—"

export function formatCount(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return EM_DASH
    }
    return Math.round(value).toLocaleString("en-US")
}

export function formatWeight(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return EM_DASH
    }
    return `${Math.round(value).toLocaleString("en-US")} kg`
}

// Kilogram totals run to six figures, so long ranges read better in tonnes.
export function formatTonnes(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return EM_DASH
    }
    return `${(value / 1000).toFixed(1)}t`
}

export function formatDays(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return EM_DASH
    }
    return `${value.toFixed(1)} days`
}

function formatWith(
    value: string | null | undefined,
    options: Intl.DateTimeFormatOptions
): string {
    if (!value) {
        return EM_DASH
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return EM_DASH
    }

    return date.toLocaleDateString("en-US", options)
}

// "Friday, August 22, 2026"
export const formatFullDate = (value: string | null | undefined): string =>
    formatWith(value, { weekday: "long", year: "numeric", month: "long", day: "numeric" })

// "Friday, August 22, 2026, 06:30 PM"
export const formatFullDateTime = (value: string | null | undefined): string =>
    formatWith(value, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })

// "Fri, Aug 22, 2026"
export const formatShortDate = (value: string | null | undefined): string =>
    formatWith(value, { weekday: "short", year: "numeric", month: "short", day: "numeric" })

// "August 22, 2026"
export const formatLongDate = (value: string | null | undefined): string =>
    formatWith(value, { year: "numeric", month: "long", day: "numeric" })

// "August 22, 2026, 06:30 PM"
export const formatLongDateTime = (value: string | null | undefined): string =>
    formatWith(value, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })

// "Aug 22, 2026, 18:30"
export const formatTableDateTime = (value: string | null | undefined): string =>
    formatWith(value, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })

// "August 2026"
export const formatMonthYear = (value: string | null | undefined): string =>
    formatWith(value, { month: "long", year: "numeric" })

// "06:30 PM"
export function formatTime(value: string | null | undefined): string {
    if (!value) {
        return EM_DASH
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return EM_DASH
    }

    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}
