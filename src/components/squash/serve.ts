// Which box the server serves from. The server picks a box at the start of
// each hand, the one they prefer or else the right, and moves across after
// each point they win. A let is replayed from the same box.
import type { Box, Match, Rally, Side } from "./api"
import { currentGame, sideOf } from "./format"

export type { Box }

const across = (box: Box): Box => (box === "right" ? "left" : "right")

export interface ServiceBox {
    box: Box
    // Names the hand being served, so switching box lasts only as long as it
    hand: string
}

/**
 * The box to serve from next, or null when it can't be told: who served
 * first in the match isn't known, or the rallies on hand are behind the
 * match. `firstServer` is the side picked to serve before the first rally.
 * `startBox` is the box a side's server likes to start a hand in, and
 * `switched` holds the hands whose server chose the other box to start.
 */
export function serviceBox(
    match: Match,
    rallies: Rally[],
    firstServer: Side | null,
    switched: Set<string> = new Set(),
    startBox: (side: Side) => Box = () => "right"
): ServiceBox | null {
    const serving = match.serving_side ?? firstServer
    if (serving === null) {
        return null
    }
    const game = currentGame(match)
    const gameRallies = rallies.filter((r) => r.game === game.number).sort((a, b) => a.number - b.number)
    if (gameRallies.length !== game.rallies) {
        return null
    }
    const won = gameRallies.filter((r) => r.won_by_side !== null)
    let run = 0
    while (run < won.length && won[won.length - 1 - run].won_by_side === serving) {
        run += 1
    }

    let served: number
    if (run === won.length) {
        // Every point this game is theirs: the hand began with the game if
        // they served first, or with the first point if they won it back
        const previous = match.games.find((g) => g.number === game.number - 1)
        const starter =
            (gameRallies[0]?.server_id ? sideOf(match, gameRallies[0].server_id) : null) ??
            (previous ? previous.winning_side : null) ??
            (won.length === 0 ? serving : firstServer)
        if (starter === null) {
            return null
        }
        served = starter === serving ? run : run - 1
    } else {
        // The first of the run won the serve back, served by the other side
        served = run - 1
    }

    const hand = `${game.number}:${won.length - run}`
    const start = switched.has(hand) ? across(startBox(serving)) : startBox(serving)
    return { box: served % 2 === 0 ? start : across(start), hand }
}
