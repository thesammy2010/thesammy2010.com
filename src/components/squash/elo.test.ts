import { expectedScore, ratingChange } from "./elo"

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
