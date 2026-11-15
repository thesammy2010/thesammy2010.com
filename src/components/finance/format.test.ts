import {
    formatChangePct,
    formatDay,
    formatGBP,
    formatGBPShort,
    formatGBPWhole,
    formatShare,
    monthRange,
    parseDay,
    shiftMonth,
    spends,
    toDayString,
    weekdayShort
} from "./format"

describe("money", () => {
    it("formats pounds and pence", () => {
        expect(formatGBP(1234.5)).toBe("£1,234.50")
        expect(formatGBP(-12)).toBe("-£12.00")
        expect(formatGBP(null)).toBe("—")
    })

    it("rounds to whole pounds", () => {
        expect(formatGBPWhole(1234.56)).toBe("£1,235")
    })

    it("shortens thousands for chart axes", () => {
        expect(formatGBPShort(2500)).toBe("£2.5k")
        expect(formatGBPShort(640)).toBe("£640")
    })

    it("signs percentage changes", () => {
        expect(formatChangePct(12.4)).toBe("+12%")
        expect(formatChangePct(-3.6)).toBe("-4%")
        expect(formatChangePct(null)).toBe("—")
    })
})

describe("days", () => {
    // new Date("2026-11-01") is UTC midnight, the evening before anywhere
    // west of Greenwich; parsing by parts keeps it the 1st locally.
    it("parses a day in local time", () => {
        const day = parseDay("2026-11-01")
        expect(day.getFullYear()).toBe(2026)
        expect(day.getMonth()).toBe(10)
        expect(day.getDate()).toBe(1)
        expect(toDayString(day)).toBe("2026-11-01")
    })

    it("formats a day", () => {
        expect(formatDay("2026-11-15")).toBe("Sun, 15 Nov 2026")
        expect(formatDay(null)).toBe("—")
    })

    it("gives a month's first and last day", () => {
        expect(monthRange(2026, 2)).toEqual({ after: "2026-02-01", before: "2026-02-28" })
        expect(monthRange(2024, 2)).toEqual({ after: "2024-02-01", before: "2024-02-29" })
        expect(monthRange(2026, 12)).toEqual({ after: "2026-12-01", before: "2026-12-31" })
    })

    it("steps months across a year boundary", () => {
        expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
        expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    })

    it("shortens weekdays", () => {
        expect(weekdayShort("monday")).toBe("Mon")
    })
})

describe("counts", () => {
    it("pluralises spends", () => {
        expect(spends(1)).toBe("1 spend")
        expect(spends(0)).toBe("0 spends")
        expect(spends(1038)).toBe("1,038 spends")
    })

    it("shows a sliver of a share as under one percent", () => {
        expect(formatShare(0.4)).toBe("<1%")
        expect(formatShare(0)).toBe("0%")
        expect(formatShare(85.6)).toBe("86%")
    })
})
