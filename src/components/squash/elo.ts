// Elo worked out in the browser, for the "try it" calculator on the page
// explaining ratings. The constants come from the API's description of the
// method, so this follows it rather than repeating its numbers.

export interface EloConstants {
    // The most one match can move a rating
    k: number
    // How many points apart makes one side about ten times as likely to win
    scale: number
    // What a draw scores, between a loss (0) and a win (1)
    draw: number
}

export type Outcome = "win" | "draw" | "loss"

/** The share of the result a side rated `rating` should take off one rated `opponent`. */
export function expectedScore(rating: number, opponent: number, scale: number): number {
    return 1 / (1 + Math.pow(10, (opponent - rating) / scale))
}

/**
 * How far a side rated `rating` moves for this result against `opponent`,
 * to one decimal place as the API gives its examples. The opponent moves by
 * the same amount the other way.
 */
export function ratingChange(rating: number, opponent: number, outcome: Outcome, constants: EloConstants): number {
    const score = outcome === "win" ? 1 : outcome === "draw" ? constants.draw : 0
    const change = constants.k * (score - expectedScore(rating, opponent, constants.scale))
    return Math.round(change * 10) / 10
}
