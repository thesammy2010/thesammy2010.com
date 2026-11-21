import React from "react"
import { render, screen } from "@testing-library/react"

import Formula from "./Formula"

const expected = {
    name: "Expected score",
    plain: "E = 1 / (1 + 10^((Rₒ − R) / 400))",
    latex: "E = \\frac{1}{1 + 10^{(R_o - R)/400}}",
    explanation: "The share of the result a side should take."
}

describe("Formula", () => {
    it("typesets the LaTeX, labelled with the plain version", () => {
        render(<Formula formula={expected} />)

        expect(screen.getByText("Expected score")).toBeInTheDocument()
        expect(screen.getByLabelText(expected.plain)).toBeInTheDocument()
        expect(screen.getByText("The share of the result a side should take.")).toBeInTheDocument()
    })

    it("shows the plain version when the LaTeX won't typeset", () => {
        render(<Formula formula={{ ...expected, latex: "\\frac{1" }} />)

        expect(screen.getByText(expected.plain)).toBeInTheDocument()
    })
})
