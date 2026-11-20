// Every game across a list of matches, for the games page.
import type { Game, Match } from "./api"

export interface GameEntry {
    match: Match
    game: Game
    // Both sides reached one short of the target, so it went to two clear
    deuce: boolean
}

export interface GameFilters {
    deuceOnly?: boolean
    // Only games scored rally by rally, which have point-by-point pages
    liveOnly?: boolean
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
}
