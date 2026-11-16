// The rating history chart's scale: round numbers either side of every
// rating, the 1000 everyone starts on included.
import type { RatingChange } from "./api"

export const START_RATING = 1000

export interface RatingScale {
    min: number
    max: number
    ticks: number[]
}

export function ratingScale(history: RatingChange[], step = 50): RatingScale {
    const values = [START_RATING, ...history.flatMap((h) => [h.rating_before, h.rating_after])]
    let min = Math.floor(Math.min(...values) / step) * step
    let max = Math.ceil(Math.max(...values) / step) * step
    // Some room when every rating sits on one line
    if (min === max) {
        min -= step
        max += step
    }
    // Five or so gridlines, however far it's spread
    let tickStep = step
    while ((max - min) / tickStep > 5) {
        tickStep *= 2
    }
    const ticks: number[] = []
    for (let t = Math.ceil(min / tickStep) * tickStep; t <= max; t += tickStep) {
        ticks.push(t)
    }
    return { min, max, ticks }
}

// The rating before the first match, then after each one.
export function ratingPoints(history: RatingChange[]): number[] {
    return history.length === 0 ? [] : [history[0].rating_before, ...history.map((h) => h.rating_after)]
}
