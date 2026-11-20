import React from "react"
import { render, screen } from "@testing-library/react"
import Privacy from "./Privacy"

describe("Privacy", () => {
    it("leads with the page heading", () => {
        render(<Privacy />)

        expect(screen.getByRole("heading", { level: 1, name: /privacy policy/i })).toBeInTheDocument()
    })

    it("gives an email to ask about anything else", () => {
        render(<Privacy />)

        expect(screen.getByRole("link", { name: "contact@mail.thesammy2010.com" })).toHaveAttribute(
            "href",
            "mailto:contact@mail.thesammy2010.com?subject=Privacy"
        )
    })
})
