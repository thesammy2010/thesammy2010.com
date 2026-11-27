import { sideColour, sideColourStyle } from "./colours"

describe("side colours", () => {
    it("are blue and orange from an API from before", () => {
        expect(sideColour({}, 1)).toBe("blue")
        expect(sideColour({}, 2)).toBe("orange")
    })

    it("follow the match, and ignore a colour this version doesn't know", () => {
        const match = { side1_colour: "green", side2_colour: "sparkly" }
        expect(sideColour(match, 1)).toBe("green")
        expect(sideColour(match, 2)).toBe("orange")
    })

    it("set the variables the side classes are drawn with", () => {
        expect(sideColourStyle({ side1_colour: "purple", side2_colour: "teal" })).toEqual({
            "--squash-side-1": "var(--squash-colour-purple)",
            "--squash-side-1-soft": "var(--squash-colour-purple-soft)",
            "--squash-side-2": "var(--squash-colour-teal)",
            "--squash-side-2-soft": "var(--squash-colour-teal-soft)"
        })
    })
})
