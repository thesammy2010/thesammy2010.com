import React from "react"
import { render, screen } from "@testing-library/react"

import MatchRecord from "./MatchRecord"

describe("MatchRecord", () => {
    it("reads won, lost, then drawn, each labelled", () => {
        const { container } = render(<MatchRecord won={3} lost={1} drawn={2} />)

        expect(container.textContent).toBe("3W 1L 2D")
        expect(screen.getByLabelText("3 won, 1 lost, 2 drawn")).toBeInTheDocument()
    })

    it("leaves draws out when there are none", () => {
        const { container } = render(<MatchRecord won={1} lost={2} />)

        expect(container.textContent).toBe("1W 2L")
        expect(screen.getByLabelText("1 won, 2 lost")).toBeInTheDocument()
    })
})
