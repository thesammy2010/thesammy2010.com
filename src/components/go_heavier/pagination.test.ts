import { dedupeById } from "./pagination"

describe("dedupeById", () => {
    it("keeps the first occurrence of a repeated id", () => {
        const result = dedupeById([
            { id: "a", v: 1 },
            { id: "b", v: 2 },
            { id: "a", v: 3 }
        ])

        expect(result).toEqual([
            { id: "a", v: 1 },
            { id: "b", v: 2 }
        ])
    })

    it("preserves order and leaves an already-unique list untouched", () => {
        const items = [{ id: "a" }, { id: "b" }, { id: "c" }]

        expect(dedupeById(items)).toEqual(items)
    })

    it("returns an empty array for an empty input", () => {
        expect(dedupeById([])).toEqual([])
    })
})
