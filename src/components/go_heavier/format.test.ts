import {
    EM_DASH,
    formatCount,
    formatDays,
    formatFullDate,
    formatLongDate,
    formatMonthYear,
    formatShortDate,
    formatTonnes,
    formatWeight
} from "./format"

describe("formatCount", () => {
    it("groups thousands", () => {
        expect(formatCount(1261)).toBe("1,261")
        expect(formatCount(7)).toBe("7")
    })

    it("rounds to whole numbers", () => {
        expect(formatCount(20.4)).toBe("20")
        expect(formatCount(20.6)).toBe("21")
    })

    it("returns an em dash for a missing value", () => {
        expect(formatCount(null)).toBe(EM_DASH)
        expect(formatCount(undefined)).toBe(EM_DASH)
        expect(formatCount(NaN)).toBe(EM_DASH)
    })

    it("keeps zero, which is a real count", () => {
        expect(formatCount(0)).toBe("0")
    })
})

describe("formatWeight", () => {
    it("appends the unit", () => {
        expect(formatWeight(134)).toBe("134 kg")
        expect(formatWeight(9039.06)).toBe("9,039 kg")
    })

    // An empty session reports a null heaviest lift.
    it("returns an em dash for a missing value", () => {
        expect(formatWeight(null)).toBe(EM_DASH)
        expect(formatWeight(undefined)).toBe(EM_DASH)
    })

    it("keeps zero rather than treating it as missing", () => {
        expect(formatWeight(0)).toBe("0 kg")
    })
})

describe("formatTonnes", () => {
    it("scales kilograms down to one decimal", () => {
        expect(formatTonnes(569500)).toBe("569.5t")
        expect(formatTonnes(96000)).toBe("96.0t")
        expect(formatTonnes(0)).toBe("0.0t")
    })

    it("returns an em dash for a missing value", () => {
        expect(formatTonnes(null)).toBe(EM_DASH)
    })
})

describe("formatDays", () => {
    it("reads as a gap", () => {
        expect(formatDays(6.1)).toBe("6.1 days")
        expect(formatDays(113.26)).toBe("113.3 days")
    })

    // The API sends null with fewer than two sessions to compare.
    it("returns an em dash for a missing value", () => {
        expect(formatDays(null)).toBe(EM_DASH)
    })
})

describe("date formatting", () => {
    const instant = "2026-08-22T12:00:00Z"

    it("formats the full, short and long styles", () => {
        expect(formatFullDate(instant)).toBe("Saturday, August 22, 2026")
        expect(formatShortDate(instant)).toBe("Sat, Aug 22, 2026")
        expect(formatLongDate(instant)).toBe("August 22, 2026")
        expect(formatMonthYear(instant)).toBe("August 2026")
    })

    it("returns an em dash for a missing value", () => {
        expect(formatFullDate(null)).toBe(EM_DASH)
        expect(formatLongDate(undefined)).toBe(EM_DASH)
        expect(formatMonthYear("")).toBe(EM_DASH)
    })

    it("returns an em dash rather than 'Invalid Date'", () => {
        expect(formatLongDate("not a date")).toBe(EM_DASH)
    })
})
