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
 * The side that served first in game `number`, as the API's _first_server
 * has it: whoever's named serving it before its first point, or else the
 * other side to the game before's, the first game's from the spin of the
 * racket. Null when that isn't known.
 */
export function firstServerOf(match: Match, rallies: Rally[], number: number): Side | null {
    let named: Side | null = null
    const gameRallies = rallies.filter((r) => r.game === number).sort((a, b) => a.number - b.number)
    for (const rally of gameRallies) {
        named = (rally.server_id ? sideOf(match, rally.server_id) : null) ?? named
        if (rally.won_by_side !== null) {
            break
        }
    }
    if (named !== null) {
        return named
    }
    if (number <= 1) {
        return match.first_serving_side ?? null
    }
    const before = firstServerOf(match, rallies, number - 1)
    return before === null ? null : before === 1 ? 2 : 1
}

/**
 * The box to serve from next, or null when it can't be told: who served
 * first in the game isn't known, or the rallies on hand are behind the
 * match. `firstServer` is the side picked to serve first in the game about
 * to start, over the one the API gives, and null once a point's been won.
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
    // As a game starts, the side picked here goes over the API's say
    const serving = firstServer ?? match.serving_side
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
    if (won.length === 0) {
        // Nothing won yet, so whoever's serving is starting the game's first hand
        served = 0
    } else if (run === won.length) {
        // Every point this game is theirs: the hand began with the game if
        // they served first, or with the first point if they won it back
        const starter = firstServerOf(match, rallies, game.number)
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
