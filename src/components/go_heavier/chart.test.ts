import { axisTicks, niceMax, peakIndex } from "./chart"

describe("niceMax", () => {
    it("rounds up to a readable tick value", () => {
        expect(niceMax(11)).toBe(12)
        expect(niceMax(256)).toBe(320)
        expect(niceMax(96000)).toBe(100000)
    })

    // Sizing straight off the maximum gave axes like 12.5 across four ticks.
    it("divides evenly by the tick count", () => {
        for (const value of [7, 11, 64, 139, 256, 1261, 96000]) {
            const ticks = axisTicks(niceMax(value, 4), 4)
            ticks.forEach(tick => expect(Number.isInteger(tick)).toBe(true))
        }
    })

    // Below one bar per tick the two goals conflict: whole-number ticks would
    // mean an axis four times the tallest bar. Filling the plot wins, and no
    // real chart here peaks that low.
    it("gives up whole ticks rather than the plot when the peak is tiny", () => {
        expect(niceMax(1, 4)).toBe(1)
    })

    // A coarse ladder left the tallest column at half height; the steps are fine
    // enough that the peak always fills most of the plot.
    it("keeps the tallest bar above 70% of the axis", () => {
        for (const value of [1, 7, 11, 64, 139, 256, 1261, 96000, 569500]) {
            expect(value / niceMax(value)).toBeGreaterThan(0.7)
        }
    })

    it("never returns zero, so bar heights stay divisible", () => {
        expect(niceMax(0)).toBe(1)
        expect(niceMax(-5)).toBe(1)
        expect(niceMax(NaN)).toBe(1)
    })

    it("never sits below the tallest bar", () => {
        for (const value of [1, 7, 11, 64, 139, 256, 1261, 96000, 569500]) {
            expect(niceMax(value)).toBeGreaterThanOrEqual(value)
        }
    })
})

describe("axisTicks", () => {
    it("spans zero to the maximum inclusive", () => {
        expect(axisTicks(12, 4)).toEqual([0, 3, 6, 9, 12])
    })

    it("returns one more tick than the count asked for", () => {
        expect(axisTicks(100, 5)).toHaveLength(6)
    })
})

describe("peakIndex", () => {
    it("finds the tallest point", () => {
        expect(peakIndex([1, 9, 4])).toBe(1)
    })

    it("keeps the first of equal peaks, so the label does not move about", () => {
        expect(peakIndex([5, 5, 2])).toBe(0)
    })

    it("reports -1 for no data", () => {
        expect(peakIndex([])).toBe(-1)
    })
})
