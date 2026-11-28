import type { Match } from "./api"
import { byDay, calendarMark, changedSince, dayKey, latestChange, monthWeeks, soonestFirst } from "./home"

function match(overrides: Partial<Match>): Match {
    return {
        id: "m",
        format: "singles",
        status: "completed",
        played_at: null,
        venue: null,
        venue_id: null,
        points_to: 11,
        best_of: null,
        notes: null,
        is_unranked: false,
        hidden: false,
        players: [
            { player_id: "a", side: 1 },
            { player_id: "b", side: 2 }
        ],
        games: [],
        side1_games: 2,
        side2_games: 1,
        winning_side: 1,
        serving_side: null,
        version: 1,
        created_by_id: "u",
        created_at: "2026-11-01T10:00:00",
        updated_at: null,
        ...overrides
    }
}

describe("monthWeeks", () => {
    it("lays a month out Monday first, padded to whole weeks", () => {
        // November 2026 starts on a Sunday and has 30 days
        const weeks = monthWeeks(2026, 10)
        expect(weeks).toHaveLength(6)
        expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null])
        expect(dayKey(weeks[0][6] as Date)).toBe("2026-11-01")
        expect(dayKey(weeks[5][0] as Date)).toBe("2026-11-30")
        expect(weeks[5].slice(1)).toEqual([null, null, null, null, null, null])
    })
})

describe("byDay", () => {
    it("groups by the day played, leaving out cancelled and undated matches", () => {
        const days = byDay([
            match({ id: "1", played_at: "2026-11-03T18:00:00" }),
            match({ id: "2", played_at: "2026-11-03T19:30:00" }),
            match({ id: "3", played_at: "2026-11-04T18:00:00", status: "cancelled" }),
            match({ id: "4" })
        ])
        expect(Array.from(days.keys())).toEqual(["2026-11-03"])
        expect(days.get("2026-11-03")?.map((m) => m.id)).toEqual(["1", "2"])
    })
})

describe("calendarMark", () => {
    it("shows the player's result, or that it's on or to come", () => {
        expect(calendarMark(match({}), "a")).toBe("W")
        expect(calendarMark(match({}), "b")).toBe("L")
        expect(calendarMark(match({}), null)).toBe("played")
        expect(calendarMark(match({ status: "in_progress" }), "a")).toBe("live")
        expect(calendarMark(match({ status: "scheduled" }), "a")).toBe("upcoming")
    })

    // A private match someone isn't in gives no result, rather than a draw
    it("shows a private match's result to nobody it's hidden from", () => {
        const hidden = match({
            is_unranked: true,
            hidden: true,
            winning_side: null,
            side1_games: null,
            side2_games: null
        })
        expect(calendarMark(hidden, "a")).toBe("played")
    })
})

describe("changedSince", () => {
    const older = match({ id: "old", updated_at: "2026-11-10T09:00:00" })
    const newer = match({ id: "new", updated_at: "2026-11-12T09:00:00.5" })
    const added = match({ id: "added", created_at: "2026-11-11T09:00:00" })

    it("lists what changed after the last look, newest first", () => {
        expect(changedSince([older, newer, added], "2026-11-10T09:00:00").map((m) => m.id)).toEqual(["new", "added"])
    })

    it("shows nothing on a first visit, and leaves out matches being played", () => {
        expect(changedSince([newer], null)).toEqual([])
        expect(
            changedSince([match({ status: "in_progress", updated_at: "2026-11-12T09:00:00" })], "2026-11-01")
        ).toEqual([])
    })

    it("remembers the newest change as the last look", () => {
        expect(latestChange([older, newer, added])).toBe("2026-11-12T09:00:00.5")
        expect(latestChange([])).toBeNull()
    })
})

describe("soonestFirst", () => {
    it("puts the soonest first and matches without a time last", () => {
        const sorted = soonestFirst([
            match({ id: "none" }),
            match({ id: "later", played_at: "2026-11-25T18:00:00" }),
            match({ id: "sooner", played_at: "2026-11-21T18:00:00" })
        ])
        expect(sorted.map((m) => m.id)).toEqual(["sooner", "later", "none"])
    })
})
