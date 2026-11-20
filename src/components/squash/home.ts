// What the squash home page works out from matches: the calendar's weeks,
// each day's matches, and what's changed since the last visit.
import type { Match } from "./api"
import { resultFor, Result } from "./stats"

/**
 * A month as weeks of seven days, Monday first, with null for the days
 * either side of it that pad out the first and last weeks.
 */
export function monthWeeks(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1)
    const days = new Date(year, month + 1, 0).getDate()
    // getDay() is 0 for Sunday; Monday first puts Sunday last
    const lead = (first.getDay() + 6) % 7
    const cells: (Date | null)[] = [
        ...Array.from({ length: lead }, () => null),
        ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))
    ]
    while (cells.length % 7 !== 0) {
        cells.push(null)
    }
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

/** "2026-11-20" for the day a date falls on where the browser is. */
export function dayKey(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Matches by the day they're played on, leaving out cancelled ones and any without a time. */
export function byDay(matches: Match[]): Map<string, Match[]> {
    const days = new Map<string, Match[]>()
    matches
        .filter((m) => m.played_at !== null && m.status !== "cancelled")
        .forEach((m) => {
            const key = dayKey(new Date(m.played_at as string))
            days.set(key, [...(days.get(key) ?? []), m])
        })
    return days
}

export type CalendarMark = Result | "live" | "upcoming" | "played"

/**
 * How a match shows on the calendar: the player's result once it's over,
 * or whether it's on or to come. "played" is a finished match seen by
 * someone not in it.
 */
export function calendarMark(match: Match, playerId: string | null): CalendarMark {
    if (match.status === "in_progress") {
        return "live"
    }
    if (match.status === "scheduled") {
        return "upcoming"
    }
    return (playerId && resultFor(match, playerId)) || "played"
}

const lastChange = (m: Match) => m.updated_at ?? m.created_at

/**
 * The newest change among the matches, as the API stamped it, to remember
 * as the point the player last looked. Kept in the API's format rather than
 * the browser's clock, so it compares with later stamps as a string.
 */
export function latestChange(matches: Match[]): string | null {
    return matches.reduce<string | null>(
        (latest, m) => (latest === null || lastChange(m) > latest ? lastChange(m) : latest),
        null
    )
}

/**
 * The matches changed or added after `since`, the last look, most recent
 * first. Matches being played are left out, being shown anyway.
 */
export function changedSince(matches: Match[], since: string | null): Match[] {
    if (!since) {
        return []
    }
    return matches
        .filter((m) => m.status !== "in_progress" && lastChange(m) > since)
        .sort((a, b) => lastChange(b).localeCompare(lastChange(a)))
}

/** The scheduled matches soonest first, those without a time last. */
export function soonestFirst(matches: Match[]): Match[] {
    return [...matches].sort((a, b) => {
        if (a.played_at === null || b.played_at === null) {
            return a.played_at === null ? (b.played_at === null ? 0 : 1) : -1
        }
        return a.played_at.localeCompare(b.played_at)
    })
}
