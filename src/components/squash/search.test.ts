import { folded, matchesSearch } from "./search"

const zoe = { name: "Zoë Smith", email: "zoe.smith@example.com" }

describe("folded", () => {
    it("ignores case, accents and spaces either side", () => {
        expect(folded("  ZOË ")).toBe("zoe")
    })
})

describe("matchesSearch", () => {
    it("finds any part of a name", () => {
        expect(matchesSearch(zoe, "zoe")).toBe(true)
        expect(matchesSearch(zoe, "smi")).toBe(true)
        expect(matchesSearch(zoe, "sam")).toBe(false)
    })

    it("matches everyone when the search is blank", () => {
        expect(matchesSearch(zoe, "  ")).toBe(true)
    })

    it("only searches emails when asked to", () => {
        expect(matchesSearch(zoe, "example")).toBe(false)
        expect(matchesSearch(zoe, "example", true)).toBe(true)
        expect(matchesSearch({ name: "Sam", email: null }, "example", true)).toBe(false)
    })
})
