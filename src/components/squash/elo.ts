// Elo worked out in the browser, for the "try it" calculator on the page
// explaining ratings. The constants come from the API's description of the
// method, so this follows it rather than repeating its numbers.

export interface EloConstants {
    // How far a standard game moves a rating, before its margin
    k: number
    // How many points apart makes one side about ten times as likely to win
    scale: number
    // What a draw scores, between a loss (0) and a win (1)
    draw: number
    // A win by this many points between equals is a standard game; missing
    // or 0 from an API from before margins counted
    margin_base?: number
    // Damps a favourite's win and lifts an upset's
    favourite_damping?: number
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

/**
 * How much more or less than a standard game a win by `margin` points moves
 * the ratings, its winners rated `lead` higher than its losers (below 0 for
 * an upset): the API's elo.margin_multiplier. 1 from an API from before.
 */
export function marginMultiplier(margin: number, lead: number, constants: EloConstants): number {
    const base = constants.margin_base ?? 0
    const damping = constants.favourite_damping ?? 0
    if (base <= 0 || damping <= 0) return 1
    const byMargin = Math.log(margin + 1) / Math.log(base + 1)
    return (byMargin * damping) / (damping + 0.001 * Math.max(lead, -1000))
}

/**
 * How far a side rated `rating` moves for a game it scored `points` of to
 * the opponent's `theirs`, to one decimal place as the API gives its
 * examples, or null for a game not yet won (11, two clear).
 */
export function gameRatingChange(
    rating: number,
    opponent: number,
    points: number,
    theirs: number,
    constants: EloConstants
): number | null {
    const finished = Math.max(points, theirs) >= 11 && Math.abs(points - theirs) >= 2
    if (!finished) return null
    const won = points > theirs
    const lead = won ? rating - opponent : opponent - rating
    const multiplier = marginMultiplier(Math.abs(points - theirs), lead, constants)
    const change = constants.k * multiplier * ((won ? 1 : 0) - expectedScore(rating, opponent, constants.scale))
    return Math.round(change * 10) / 10
}
