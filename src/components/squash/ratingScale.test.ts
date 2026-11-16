import type { RatingChange } from "./api"
import { ratingPoints, ratingScale } from "./ratingScale"

const change = (before: number, after: number): RatingChange => ({
    match_id: `${before}-${after}`,
    played_at: null,
    rating_before: before,
    rating_after: after,
    change: after - before
})

describe("ratingScale", () => {
    it("rounds out to the step around every rating and 1000", () => {
        expect(ratingScale([change(1000, 1016), change(1016, 1041)])).toEqual({
            min: 1000,
            max: 1050,
            ticks: [1000, 1050]
        })
        expect(ratingScale([change(1000, 962)]).min).toBe(950)
    })

    it("widens the gridlines when the ratings spread far", () => {
        const scale = ratingScale([change(1000, 1310), change(1310, 880)])
        expect(scale).toMatchObject({ min: 850, max: 1350 })
        expect(scale.ticks).toEqual([900, 1000, 1100, 1200, 1300])
    })

    it("gives a flat history some room", () => {
        expect(ratingScale([])).toEqual({ min: 950, max: 1050, ticks: [950, 1000, 1050] })
    })
})

describe("ratingPoints", () => {
    it("starts from the rating before the first match", () => {
        expect(ratingPoints([change(1000, 1016), change(1016, 1004)])).toEqual([1000, 1016, 1004])
        expect(ratingPoints([])).toEqual([])
    })
})
