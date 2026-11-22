// Every game across a list of matches, for the games page.
import type { Game, Match } from "./api"

export interface GameEntry {
    match: Match
    game: Game
    // Both sides reached one short of the target, so it went to two clear
    deuce: boolean
}

// How long a game took, from its first rally to its winning point, in
// bands round how long the group's games tend to take
export type GameLength = "short" | "medium" | "long"

export const GAME_LENGTHS: { value: GameLength; label: string; min: number; max: number }[] = [
    { value: "short", label: "Under 4 min", min: 0, max: 4 * 60 },
    { value: "medium", label: "4–6 min", min: 4 * 60, max: 6 * 60 },
    { value: "long", label: "Over 6 min", min: 6 * 60, max: Infinity }
]

// The newest first, as the matches come, or by how long they took
export type GameSort = "newest" | "longest" | "shortest"

export interface GameFilters {
    deuceOnly?: boolean
    // Only games scored rally by rally, which have point-by-point pages
    liveOnly?: boolean
    // Only games timed at this length, so only finished games scored live
    length?: GameLength
    sort?: GameSort
}

function inLength(game: Game, length: GameLength): boolean {
    const band = GAME_LENGTHS.find((b) => b.value === length)!
    const seconds = game.duration_seconds
    return seconds != null && seconds >= band.min && seconds < band.max
}

export function wentToDeuce(game: Game, pointsTo: number): boolean {
    return game.side1_points >= pointsTo - 1 && game.side2_points >= pointsTo - 1
}

/**
 * The games of the matches, in the order the matches come (most recent
 * first, as the API lists them) and each match's latest game first.
 * Cancelled matches are left out, as are matches whose games are hidden
 * from the caller, having none to show.
 */
export function gamesOf(matches: Match[], filters: GameFilters = {}): GameEntry[] {
    return matches
        .filter((m) => m.status !== "cancelled")
        .flatMap((match) =>
            [...match.games]
                .sort((a, b) => b.number - a.number)
                .map((game) => ({ match, game, deuce: wentToDeuce(game, match.points_to) }))
        )
        .filter((entry) => !filters.deuceOnly || entry.deuce)
        .filter((entry) => !filters.liveOnly || entry.game.rallies > 0)
        .filter((entry) => !filters.length || inLength(entry.game, filters.length))
        .sort((a, b) => byLength(a.game, b.game, filters.sort ?? "newest"))
}

// Timed games by how long they took, those without a time after them in the
// order they came; the newest first keeps the order they came in.
function byLength(a: Game, b: Game, sort: GameSort): number {
    if (sort === "newest") {
        return 0
    }
    const x = a.duration_seconds ?? null
    const y = b.duration_seconds ?? null
    if (x === null || y === null) {
        return x === null ? (y === null ? 0 : 1) : -1
    }
    return sort === "longest" ? y - x : x - y
}
