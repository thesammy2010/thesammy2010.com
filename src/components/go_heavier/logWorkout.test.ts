import {
    MAX_WORKOUTS_PER_REQUEST,
    SetRow,
    buildPayloads,
    chunk,
    countByExercise,
    emptyRow,
    filterExercises,
    nowForInput,
    setIndexes,
    toInstant,
    validateRows
} from "./logWorkout"

function row(overrides: Partial<SetRow> = {}): SetRow {
    return { ...emptyRow("k", "ex-1"), weightKg: "40", ...overrides }
}

describe("setIndexes", () => {
    // A set's index counts within its own exercise, which is how the API stores it.
    it("counts within each exercise, not across the session", () => {
        const rows = [
            row({ key: "a", exerciseId: "bench" }),
            row({ key: "b", exerciseId: "bench" }),
            row({ key: "c", exerciseId: "squat" }),
            row({ key: "d", exerciseId: "bench" })
        ]

        expect(setIndexes(rows)).toEqual([1, 2, 1, 3])
    })

    it("handles an empty list", () => {
        expect(setIndexes([])).toEqual([])
    })

    // Adding to a session that already has sets must not start a second "set 1".
    it("carries on from what the session already holds", () => {
        const rows = [
            row({ key: "a", exerciseId: "bench" }),
            row({ key: "b", exerciseId: "squat" }),
            row({ key: "c", exerciseId: "bench" })
        ]

        expect(setIndexes(rows, { bench: 3 })).toEqual([4, 1, 5])
    })
})

describe("countByExercise", () => {
    it("counts the sets logged per exercise", () => {
        expect(
            countByExercise([
                { exercise_id: "bench" },
                { exercise_id: "squat" },
                { exercise_id: "bench" }
            ])
        ).toEqual({ bench: 2, squat: 1 })
    })

    it("returns nothing for an empty session", () => {
        expect(countByExercise([])).toEqual({})
    })
})

describe("chunk", () => {
    it("splits into batches of the given size", () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })

    it("keeps a short list in one batch", () => {
        expect(chunk([1, 2], 10)).toEqual([[1, 2]])
    })

    it("returns nothing for an empty list", () => {
        expect(chunk([], 10)).toEqual([])
    })

    // The endpoint accepts at most ten sets per request.
    it("never exceeds the request limit", () => {
        const rows = Array.from({ length: 23 }, (_, i) => i)
        const batches = chunk(rows, MAX_WORKOUTS_PER_REQUEST)

        expect(batches).toHaveLength(3)
        batches.forEach(batch => expect(batch.length).toBeLessThanOrEqual(MAX_WORKOUTS_PER_REQUEST))
        expect(batches.flat()).toEqual(rows)
    })
})

describe("filterExercises", () => {
    const exercises = [
        { name: "Overhead Press" },
        { name: "Bench Press" },
        { name: "Hanging Knee Raise" }
    ]

    it("returns everything for an empty query", () => {
        expect(filterExercises(exercises, "")).toHaveLength(3)
        expect(filterExercises(exercises, "   ")).toHaveLength(3)
    })

    it("matches case insensitively on part of a word", () => {
        expect(filterExercises(exercises, "bench")).toEqual([{ name: "Bench Press" }])
        expect(filterExercises(exercises, "KNEE")).toEqual([{ name: "Hanging Knee Raise" }])
    })

    it("matches every term in any order", () => {
        expect(filterExercises(exercises, "press over")).toEqual([{ name: "Overhead Press" }])
    })

    it("returns nothing when a term does not match", () => {
        expect(filterExercises(exercises, "bench squat")).toEqual([])
    })
})

describe("validateRows", () => {
    it("accepts a well formed set", () => {
        expect(validateRows([row()])).toBeNull()
    })

    it("insists on at least one set", () => {
        expect(validateRows([])).toBe("Add at least one set")
    })

    it("insists on an exercise", () => {
        expect(validateRows([row({ exerciseId: "" })])).toMatch(/pick an exercise/)
    })

    it("bounds repetitions", () => {
        expect(validateRows([row({ repetitions: "0" })])).toMatch(/repetitions/)
        expect(validateRows([row({ repetitions: "100" })])).toMatch(/repetitions/)
        expect(validateRows([row({ repetitions: "8.5" })])).toMatch(/whole number/)
    })

    it("requires a weight but allows a negative one for assisted work", () => {
        expect(validateRows([row({ weightKg: "" })])).toMatch(/weight/)
        expect(validateRows([row({ weightKg: "-20" })])).toBeNull()
        expect(validateRows([row({ weightKg: "1000" })])).toMatch(/weight/)
    })

    // The API rejects a bar weight of zero outright, which is why blank is the
    // way to say "no bar".
    it("allows a blank bar weight but not a zero one", () => {
        expect(validateRows([row({ barWeightKg: "" })])).toBeNull()
        expect(validateRows([row({ barWeightKg: "0" })])).toMatch(/bar weight/)
        expect(validateRows([row({ barWeightKg: "20" })])).toBeNull()
    })

    it("allows a blank or negative supplementary weight", () => {
        expect(validateRows([row({ supplementaryWeightKg: "" })])).toBeNull()
        expect(validateRows([row({ supplementaryWeightKg: "-10" })])).toBeNull()
        expect(validateRows([row({ supplementaryWeightKg: "100" })])).toMatch(/supplementary/)
    })

    it("names the offending set", () => {
        expect(validateRows([row(), row({ key: "b", repetitions: "0" })])).toMatch(/^Set 2:/)
    })
})

describe("buildPayloads", () => {
    it("sends null rather than zero for absent optional values", () => {
        const [payload] = buildPayloads([row()], "session-1")

        expect(payload.bar_weight_kg).toBeNull()
        expect(payload.supplementary_weight_kg).toBeNull()
        expect(payload.notes).toBeNull()
    })

    it("keeps the values that were filled in", () => {
        const [payload] = buildPayloads(
            [row({ barWeightKg: "20", supplementaryWeightKg: "2.5", notes: "  felt strong  " })],
            "session-1"
        )

        expect(payload.bar_weight_kg).toBe(20)
        expect(payload.supplementary_weight_kg).toBe(2.5)
        expect(payload.notes).toBe("felt strong")
    })

    it("continues the numbering when the session already has sets", () => {
        const payloads = buildPayloads(
            [row({ key: "a", exerciseId: "bench" }), row({ key: "b", exerciseId: "bench" })],
            "session-1",
            { bench: 2 }
        )

        expect(payloads.map(p => p.index)).toEqual([3, 4])
    })

    it("stamps the session and the per exercise index onto every set", () => {
        const payloads = buildPayloads(
            [row({ key: "a", exerciseId: "bench" }), row({ key: "b", exerciseId: "bench" })],
            "session-1"
        )

        expect(payloads.map(p => p.session_id)).toEqual(["session-1", "session-1"])
        expect(payloads.map(p => p.index)).toEqual([1, 2])
    })
})

describe("toInstant", () => {
    // The picker hands back local wall-clock time with no zone attached.
    it("converts local wall clock time to a UTC instant", () => {
        const local = "2026-08-22T18:30"
        const instant = toInstant(local)

        expect(instant).toBe(new Date(local).toISOString())
        expect(new Date(instant).getHours()).toBe(18)
    })
})

describe("nowForInput", () => {
    it("formats for a datetime-local field", () => {
        expect(nowForInput(new Date(2026, 7, 22, 9, 5))).toBe("2026-08-22T09:05")
    })
})
