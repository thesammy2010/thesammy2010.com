import { SessionSummary, buildMonthlyTotals, fetchAllSessions, indexSessions } from "./sessions"

function session(id: string, workoutTime: string, overrides: Partial<SessionSummary> = {}): SessionSummary {
    return {
        id,
        workout_time: workoutTime,
        location_id: "loc-1",
        location: "The Gym",
        sets: 10,
        exercises: 3,
        repetitions: 100,
        volume_kg: 1000,
        heaviest_weight_kg: 50,
        ...overrides
    }
}

describe("indexSessions", () => {
    it("keys sessions by id", () => {
        const byId = indexSessions([session("a", "2026-05-01T10:00:00Z"), session("b", "2026-06-01T10:00:00Z")])

        expect(Object.keys(byId)).toHaveLength(2)
        expect(byId["a"].workout_time).toBe("2026-05-01T10:00:00Z")
    })

    it("returns an empty lookup for no sessions", () => {
        expect(indexSessions([])).toEqual({})
    })
})

describe("buildMonthlyTotals", () => {
    it("returns nothing when there are no sessions", () => {
        expect(buildMonthlyTotals([])).toEqual([])
    })

    it("sums each month", () => {
        const months = buildMonthlyTotals([
            session("a", "2026-05-04T10:00:00Z", { sets: 10, repetitions: 100, volume_kg: 1000 }),
            session("b", "2026-05-20T10:00:00Z", { sets: 12, repetitions: 120, volume_kg: 1500 })
        ])

        expect(months).toHaveLength(1)
        expect(months[0]).toMatchObject({ visits: 2, sets: 22, repetitions: 220, volume_kg: 2500 })
    })

    // A month with no training is part of the story; dropping it would make a
    // three month break look like an unbroken run.
    it("keeps months with no sessions", () => {
        const months = buildMonthlyTotals([
            session("a", "2026-01-15T10:00:00Z"),
            session("b", "2026-04-15T10:00:00Z")
        ])

        expect(months).toHaveLength(4)
        expect(months.map(month => month.visits)).toEqual([1, 0, 0, 1])
    })

    it("labels months with a short name and a two digit year", () => {
        const months = buildMonthlyTotals([session("a", "2026-08-15T10:00:00Z")])

        expect(months[0].label).toBe("Aug 26")
    })

    it("spans a year boundary in order", () => {
        const months = buildMonthlyTotals([
            session("a", "2025-11-15T10:00:00Z"),
            session("b", "2026-02-15T10:00:00Z")
        ])

        expect(months.map(month => month.label)).toEqual(["Nov 25", "Dec 25", "Jan 26", "Feb 26"])
    })

    it("does not depend on the sessions arriving in order", () => {
        const ascending = buildMonthlyTotals([
            session("a", "2026-03-15T10:00:00Z"),
            session("b", "2026-05-15T10:00:00Z")
        ])
        const descending = buildMonthlyTotals([
            session("b", "2026-05-15T10:00:00Z"),
            session("a", "2026-03-15T10:00:00Z")
        ])

        expect(descending).toEqual(ascending)
    })

    it("totals every session exactly once", () => {
        const sessions = [
            session("a", "2026-01-05T10:00:00Z", { sets: 5 }),
            session("b", "2026-02-05T10:00:00Z", { sets: 7 }),
            session("c", "2026-02-25T10:00:00Z", { sets: 9 })
        ]
        const months = buildMonthlyTotals(sessions)

        expect(months.reduce((total, month) => total + month.visits, 0)).toBe(sessions.length)
        expect(months.reduce((total, month) => total + month.sets, 0)).toBe(21)
    })
})

describe("fetchAllSessions", () => {
    const originalFetch = global.fetch

    afterEach(() => {
        global.fetch = originalFetch
    })

    function mockPages(pages: SessionSummary[][]) {
        const fetchMock = jest.fn((url: string) => {
            const page = Number(new URL(url, "http://localhost").searchParams.get("page"))
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(pages[page - 1] ?? [])
            })
        })
        global.fetch = fetchMock as unknown as typeof fetch
        return fetchMock
    }

    it("walks pages until one comes back empty", async () => {
        mockPages([[session("a", "2026-01-01T10:00:00Z")], [session("b", "2026-02-01T10:00:00Z")]])

        const sessions = await fetchAllSessions()

        expect(sessions.map(item => item.id)).toEqual(["a", "b"])
    })

    // StrictMode mounts twice in development, and several pages ask at once.
    it("shares one walk between concurrent callers", async () => {
        const fetchMock = mockPages([[session("a", "2026-01-01T10:00:00Z")]])

        const [first, second] = await Promise.all([fetchAllSessions(), fetchAllSessions()])

        expect(first).toBe(second)
        // Two pages: the one with data, and the empty one that ends the walk.
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("fetches again once the shared walk has settled", async () => {
        const fetchMock = mockPages([[session("a", "2026-01-01T10:00:00Z")]])

        await fetchAllSessions()
        await fetchAllSessions()

        expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it("throws when a page fails", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve([]) })
        ) as unknown as typeof fetch

        await expect(fetchAllSessions()).rejects.toThrow("Failed to load sessions")
    })
})
