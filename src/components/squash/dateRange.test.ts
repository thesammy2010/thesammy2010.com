import { isoDay, presets, rangeLabel } from "./dateRange"

// Saturday 21 November 2026
const today = new Date(2026, 10, 21)
const label = (from: string, to: string) => rangeLabel({ from, to }, today)

describe("rangeLabel", () => {
    it("names an open range and the presets", () => {
        expect(label("", "")).toBe("Any time")
        expect(label("2026-11-15", "")).toBe("Last 7 days")
        expect(label("2026-10-23", "")).toBe("Last 30 days")
        expect(label("2026-11-01", "2026-11-30")).toBe("This month")
        expect(label("2026-10-01", "2026-10-31")).toBe("Last month")
        expect(label("2026-01-01", "2026-12-31")).toBe("This year")
    })

    it("says a range as briefly as it reads", () => {
        expect(label("2026-11-03", "2026-11-15")).toBe("3–15 Nov")
        expect(label("2026-10-28", "2026-11-03")).toBe("28 Oct – 3 Nov")
        expect(label("2026-11-03", "2026-11-03")).toBe("3 Nov")
        expect(label("2026-11-03", "")).toBe("Since 3 Nov")
        expect(label("", "2026-11-15")).toBe("Until 15 Nov")
    })

    it("only gives years that aren't this one", () => {
        expect(label("2025-11-03", "2025-11-15")).toBe("3–15 Nov 2025")
        expect(label("2025-03-03", "2025-11-15")).toBe("3 Mar – 15 Nov 2025")
        expect(label("2025-12-28", "2026-01-03")).toBe("28 Dec 2025 – 3 Jan 2026")
        expect(label("2025-11-03", "")).toBe("Since 3 Nov 2025")
    })
})

describe("presets", () => {
    it("wraps across the start of the year", () => {
        const january = presets(new Date(2027, 0, 10))
        expect(january.find((p) => p.label === "Last month")).toMatchObject({ from: "2026-12-01", to: "2026-12-31" })
        expect(january.find((p) => p.label === "Last 30 days")?.from).toBe("2026-12-12")
    })
})

describe("isoDay", () => {
    it("pads the month and day", () => {
        expect(isoDay(new Date(2026, 0, 5))).toBe("2026-01-05")
    })
})
