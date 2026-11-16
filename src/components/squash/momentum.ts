// The momentum ("worm") chart's data: side 1's lead after every rally, game
// by game, each game starting level. Games sit one after another along x
// with a step's gap between them.
import type { Rally, Side } from "./api"

export interface MomentumPoint {
    x: number
    // Side 1's points less side 2's, in this game so far
    lead: number
    side1: number
    side2: number
    // The rally that made the score, or null for a game's 0-0 start
    rally: { number: number; wonBy: Side } | null
}

export interface MomentumGame {
    number: number
    points: MomentumPoint[]
}

export interface Momentum {
    games: MomentumGame[]
    // The x after the last point
    width: number
    // The biggest lead either way, at least 3 so a tight game isn't all swing
    maxLead: number
}

const MIN_SCALE = 3

/** Counted from who won each rally, so it holds however the scores are stored. */
export function momentum(rallies: Rally[]): Momentum {
    const byGame = new Map<number, Rally[]>()
    rallies.forEach((rally) => byGame.set(rally.game, [...(byGame.get(rally.game) ?? []), rally]))

    let x = 0
    let maxLead = MIN_SCALE
    const games = Array.from(byGame.entries())
        .sort(([a], [b]) => a - b)
        .map(([number, gameRallies]) => {
            let side1 = 0
            let side2 = 0
            const points: MomentumPoint[] = [{ x, lead: 0, side1, side2, rally: null }]
            ;[...gameRallies]
                .sort((a, b) => a.number - b.number)
                .forEach((rally) => {
                    if (rally.won_by_side === 1) {
                        side1 += 1
                    } else {
                        side2 += 1
                    }
                    x += 1
                    maxLead = Math.max(maxLead, Math.abs(side1 - side2))
                    points.push({
                        x,
                        lead: side1 - side2,
                        side1,
                        side2,
                        rally: { number: rally.number, wonBy: rally.won_by_side }
                    })
                })
            // A step's gap before the next game
            x += 1
            return { number, points }
        })

    return { games, width: Math.max(x - 1, 1), maxLead }
}

/** The rally point nearest x, skipping each game's 0-0 start. */
export function nearestPoint(data: Momentum, x: number): { game: number; point: MomentumPoint } | null {
    let best: { game: number; point: MomentumPoint } | null = null
    data.games.forEach((game) =>
        game.points.forEach((point) => {
            if (point.rally && (!best || Math.abs(point.x - x) < Math.abs(best.point.x - x))) {
                best = { game: game.number, point }
            }
        })
    )
    return best
}
