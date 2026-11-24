import React from "react"
import { render, screen } from "@testing-library/react"

import StatRings, { beats, count, rate, share } from "./StatRings"

describe("StatRings", () => {
    it("is better where the figure beats the other's", () => {
        expect(beats(rate("Rallies won", 0.6, 0.4, "You"))).toBe(true)
        expect(beats(rate("Rallies won", 0.4, 0.6, "You"))).toBe(false)
        expect(beats(rate("Rallies won", 0.5, 0.5, "You"))).toBeNull()
    })

    it("counts fewer leads lost as better", () => {
        expect(beats(count("Leads of 3+ lost", 1, 3, "You", false))).toBe(true)
    })

    it("compares nothing without another's figure", () => {
        expect(beats(rate("Rallies won", 0.6))).toBeNull()
    })

    it("shares won of a total, the other's too", () => {
        const figure = share("Games won", 3, 4, 1, 4, "Sam")

        expect(figure.value).toBe("75%")
        expect(figure.otherLabel).toBe("Sam 25%")
        expect(beats(figure)).toBe(true)
    })

    it("shows each figure with its title and the other's beneath", () => {
        render(<StatRings figures={[share("Matches won", 2, 3, 1, 3, "Sam")]} />)

        expect(screen.getByText("Matches won")).toBeInTheDocument()
        expect(screen.getByText("67%")).toBeInTheDocument()
        expect(screen.getByText("Sam 33%")).toBeInTheDocument()
        expect(screen.getByRole("listitem")).toHaveClass("squash-ring-better")
    })
})
