import { expectedScore, gameK, gameRatingChange, marginMultiplier, ratingChange } from "./elo"

// The API's own description of the method, version 2
const constants = { k: 32, scale: 400, draw: 0.5 }

describe("expectedScore", () => {
    it("is even between equals, and about 0.91 for a side 400 points higher", () => {
        expect(expectedScore(1000, 1000, 400)).toBe(0.5)
        expect(expectedScore(1400, 1000, 400)).toBeCloseTo(0.909, 3)
    })
})

describe("ratingChange", () => {
    // The worked examples the API gives, which its own ratings code produced
    it("matches the API's worked examples", () => {
        expect(ratingChange(1000, 1100, "win", constants)).toBe(20.5)
        expect(ratingChange(1100, 1000, "win", constants)).toBe(11.5)
        expect(ratingChange(1000, 1100, "draw", constants)).toBe(4.5)
        // Doubles plays as each pair's average: 1200 and 1000 against 1050s
        expect(ratingChange(1100, 1050, "win", constants)).toBe(13.7)
    })

    it("moves the loser by the same amount the other way", () => {
        expect(ratingChange(1100, 1000, "loss", constants)).toBe(-20.5)
    })
})

// The API's own description of the method, version 4, with margins
const v4 = { k: 10, scale: 400, draw: 0.5, margin_base: 4, favourite_damping: 2.2 }

describe("gameRatingChange", () => {
    // The worked examples the API gives, which its own ratings code produced
    it("matches the API's worked examples", () => {
        expect(gameRatingChange(1000, 1100, 11, 5, v4)).toBe(8.1)
        expect(gameRatingChange(1100, 1000, 11, 5, v4)).toBe(4.2)
        expect(gameRatingChange(1000, 1000, 12, 10, v4)).toBe(3.4)
        expect(gameRatingChange(1000, 1000, 11, 0, v4)).toBe(7.7)
        // Doubles plays as each pair's average: 1200 and 1000 against 1050s
        expect(gameRatingChange(1100, 1050, 11, 5, v4)).toBe(5.1)
    })

    it("moves the loser by the same amount the other way", () => {
        expect(gameRatingChange(1100, 1000, 5, 11, v4)).toBe(-8.1)
    })

    it("doesn't rate a game that isn't finished", () => {
        expect(gameRatingChange(1000, 1000, 11, 10, v4)).toBeNull()
        expect(gameRatingChange(1000, 1000, 9, 7, v4)).toBeNull()
    })

    it("counts every game the same for an API from before margins", () => {
        expect(marginMultiplier(2, 0, constants)).toBe(1)
        expect(marginMultiplier(4, 0, v4)).toBeCloseTo(1)
    })
})

describe("gameK", () => {
    const v5 = { k: 10, scale: 400, draw: 0.5, margin_base: 4, favourite_damping: 2.2, k_new: 25, new_games: 30 }

    it("is the average of the players' K, a new player's being k_new", () => {
        expect(gameK(v5, false, false)).toBe(10)
        expect(gameK(v5, true, false)).toBe(17.5)
        expect(gameK(v5, true, true)).toBe(25)
    })

    it("is k from an API from before new players moved faster", () => {
        expect(gameK({ k: 10, scale: 400, draw: 0.5 }, true, true)).toBe(10)
    })

    it("matches the API's example of a new player's first game", () => {
        expect(gameRatingChange(1000, 1000, 11, 5, v5, gameK(v5, true, false))).toBe(10.6)
    })
})
