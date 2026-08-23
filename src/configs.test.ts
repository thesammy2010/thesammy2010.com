import { countryCodeToEmoji, formatNotes } from "./configs"

describe("formatNotes", () => {
    it("keeps real notes, trimmed", () => {
        expect(formatNotes("felt strong")).toBe("felt strong")
        expect(formatNotes("  drop set  ")).toBe("drop set")
    })

    it("returns nothing for an empty value", () => {
        expect(formatNotes("")).toBe("")
        expect(formatNotes(null)).toBe("")
        expect(formatNotes(undefined)).toBe("")
    })

    // Missing text used to arrive as the literal string "NaN", which is truthy
    // and so rendered as a note.
    it("treats placeholder strings as no note", () => {
        expect(formatNotes("NaN")).toBe("")
        expect(formatNotes("nan")).toBe("")
        expect(formatNotes("None")).toBe("")
        expect(formatNotes("null")).toBe("")
        expect(formatNotes("  NaN  ")).toBe("")
    })

    it("does not swallow a note that merely contains a placeholder word", () => {
        expect(formatNotes("none left in the tank")).toBe("none left in the tank")
    })
})

describe("countryCodeToEmoji", () => {
    it("maps a two letter code to its flag", () => {
        expect(countryCodeToEmoji("GB")).toBe("🇬🇧")
        expect(countryCodeToEmoji("US")).toBe("🇺🇸")
    })

    it("accepts lower case", () => {
        expect(countryCodeToEmoji("gb")).toBe("🇬🇧")
    })
})
