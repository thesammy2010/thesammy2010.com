// Group-wide figures for the squash stats page, worked out from completed
// matches. The API's own stats are per player; everything here spans the
// group, so it's computed from the matches themselves. Like the API, a
// completed match with no winning side counts as a draw.
import type { Game, Match, MatchFormat, Side } from "./api"
import { sideOf } from "./format"

export type Result = "W" | "L" | "D"

export interface Totals {
    matches: number
    games: number
    points: number
    // Matches with at least one game scored point by point
    scoredLive: number
}

export function totals(matches: Match[]): Totals {
    const games = matches.flatMap((m) => m.games)
    return {
        matches: matches.length,
        games: games.length,
        points: games.reduce((total, g) => total + g.side1_points + g.side2_points, 0),
        scoredLive: matches.filter((m) => m.games.some((g) => g.rallies > 0)).length
    }
}

export function resultFor(match: Match, playerId: string): Result | null {
    const side = sideOf(match, playerId)
    // A private match the caller isn't in has no result to give
    if (side === null || match.hidden) {
        return null
    }
    if (match.winning_side === null) {
        return "D"
    }
    return match.winning_side === side ? "W" : "L"
}

export interface PlayerForm {
    // Most recent first, each with the match it came from
    results: { result: Result; matchId: string }[]
    // The run the player is on now: "W3" is three wins in a row
    current: { result: Result; length: number } | null
    longestWinStreak: number
}

/** A player's results, given matches most recent first as the API lists them. */
export function formFor(matches: Match[], playerId: string): PlayerForm {
    const results = matches.flatMap((m) => {
        const result = resultFor(m, playerId)
        return result === null ? [] : [{ result, matchId: m.id }]
    })

    let current: PlayerForm["current"] = null
    if (results.length > 0) {
        const first = results[0].result
        const length = results.findIndex((r) => r.result !== first)
        current = { result: first, length: length === -1 ? results.length : length }
    }

    let longestWinStreak = 0
    let run = 0
    results.forEach((r) => {
        run = r.result === "W" ? run + 1 : 0
        longestWinStreak = Math.max(longestWinStreak, run)
    })

    return { results, current, longestWinStreak }
}

function pointsFor(match: Match, side: Side): number {
    return match.games.reduce((total, g) => total + (side === 1 ? g.side1_points : g.side2_points), 0)
}

// The winner's points less the loser's, across every game.
export function pointMargin(match: Match): number {
    if (match.winning_side === null) {
        return 0
    }
    const loser: Side = match.winning_side === 1 ? 2 : 1
    return pointsFor(match, match.winning_side) - pointsFor(match, loser)
}

export interface Records {
    // The most points in a single game
    longestGame: { match: Match; game: Game } | null
    // The fewest points between winner and loser, most games breaking a tie
    closestMatch: Match | null
    // The most points between winner and loser
    biggestWin: Match | null
}

// Ties go to the earliest in the list, which is the most recent match.
export function records(matches: Match[]): Records {
    let longestGame: Records["longestGame"] = null
    matches.forEach((match) =>
        match.games.forEach((game) => {
            const points = game.side1_points + game.side2_points
            if (!longestGame || points > longestGame.game.side1_points + longestGame.game.side2_points) {
                longestGame = { match, game }
            }
        })
    )

    const decided = matches.filter((m) => m.winning_side !== null && m.games.length > 0)
    let closestMatch: Match | null = null
    let biggestWin: Match | null = null
    decided.forEach((match) => {
        const margin = pointMargin(match)
        if (
            !closestMatch ||
            margin < pointMargin(closestMatch) ||
            (margin === pointMargin(closestMatch) && match.games.length > closestMatch.games.length)
        ) {
            closestMatch = match
        }
        if (!biggestWin || margin > pointMargin(biggestWin)) {
            biggestWin = match
        }
    })

    return { longestGame, closestMatch, biggestWin }
}

export interface Rivalry {
    // Sorted ids, so a pairing is the same whichever side each was on
    playerIds: [string, string]
    played: number
    // Wins for playerIds[0] and playerIds[1]
    wins: [number, number]
    drawn: number
}

/** Singles pairings, the most played first. */
export function rivalries(matches: Match[]): Rivalry[] {
    const byPair = new Map<string, Rivalry>()
    matches
        .filter((m) => m.format === "singles" && m.players.length === 2)
        .forEach((match) => {
            const playerIds = match.players.map((p) => p.player_id).sort() as [string, string]
            const key = playerIds.join(":")
            const rivalry = byPair.get(key) ?? { playerIds, played: 0, wins: [0, 0], drawn: 0 }
            rivalry.played += 1
            const result = resultFor(match, playerIds[0])
            if (result === "W") {
                rivalry.wins[0] += 1
            } else if (result === "L") {
                rivalry.wins[1] += 1
            } else {
                rivalry.drawn += 1
            }
            byPair.set(key, rivalry)
        })
    return Array.from(byPair.values()).sort((a, b) => b.played - a.played)
}

export interface Partnership {
    // Sorted ids, so a pair is the same whichever was listed first
    playerIds: [string, string]
    played: number
    won: number
    lost: number
    drawn: number
}

/** Doubles pairs on the same side, the most played together first. */
export function partnerships(matches: Match[]): Partnership[] {
    const byPair = new Map<string, Partnership>()
    matches
        .filter((m) => m.format === "doubles")
        .forEach((match) =>
            ([1, 2] as Side[]).forEach((side) => {
                const ids = match.players.filter((p) => p.side === side).map((p) => p.player_id)
                if (ids.length !== 2) {
                    return
                }
                const playerIds = ids.sort() as [string, string]
                const key = playerIds.join(":")
                const pair = byPair.get(key) ?? { playerIds, played: 0, won: 0, lost: 0, drawn: 0 }
                pair.played += 1
                if (match.winning_side === null) {
                    pair.drawn += 1
                } else if (match.winning_side === side) {
                    pair.won += 1
                } else {
                    pair.lost += 1
                }
                byPair.set(key, pair)
            })
        )
    return Array.from(byPair.values()).sort((a, b) => b.played - a.played)
}

// The format to open the page on: whichever has more matches, singles on a tie.
export function busierFormat(matches: Match[]): MatchFormat {
    const doubles = matches.filter((m) => m.format === "doubles").length
    return doubles > matches.length - doubles ? "doubles" : "singles"
}

export interface MonthCount {
    label: string
    value: number
}

/** Matches played each month from the first to the last, empty months included. */
export function matchesPerMonth(matches: Match[]): MonthCount[] {
    const dates = matches
        .map((m) => (m.played_at ? new Date(m.played_at) : null))
        .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
    if (dates.length === 0) {
        return []
    }

    const counts = new Map<string, number>()
    dates.forEach((d) => {
        const key = `${d.getFullYear()}-${d.getMonth()}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    const times = dates.map((d) => d.getTime())
    const first = new Date(Math.min(...times))
    const last = new Date(Math.max(...times))
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
    const end = new Date(last.getFullYear(), last.getMonth(), 1)

    const months: MonthCount[] = []
    while (cursor <= end) {
        months.push({
            label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
            value: counts.get(`${cursor.getFullYear()}-${cursor.getMonth()}`) ?? 0
        })
        cursor.setMonth(cursor.getMonth() + 1)
    }
    return months
}
