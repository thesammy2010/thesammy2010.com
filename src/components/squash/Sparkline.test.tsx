import React from "react"
import { render, screen } from "@testing-library/react"

import Sparkline from "./Sparkline"

describe("Sparkline", () => {
    it("reads out the range it shows", () => {
        render(<Sparkline points={[1000, 1016, 1001, 1043]} label="Your overall rating" />)

        expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Your overall rating: from 1000 to 1043")
    })

    it("draws nothing without a path to show", () => {
        const { container } = render(<Sparkline points={[1000]} label="Your overall rating" />)

        expect(container).toBeEmptyDOMElement()
    })

    it("still draws a run that never moved", () => {
        render(<Sparkline points={[1000, 1000, 1000]} label="Flat" />)

        expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Flat: from 1000 to 1000")
    })
})
