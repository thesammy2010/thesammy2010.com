import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import Privacy from "./Privacy"

describe("Privacy", () => {
    it("leads with the page heading", () => {
        render(
            <MemoryRouter>
                <Privacy />
            </MemoryRouter>
        )

        expect(screen.getByRole("heading", { level: 1, name: /privacy policy/i })).toBeInTheDocument()
    })

    it("gives an email to ask about anything else", () => {
        render(
            <MemoryRouter>
                <Privacy />
            </MemoryRouter>
        )

        expect(screen.getByRole("link", { name: "contact@mail.thesammy2010.com" })).toHaveAttribute(
            "href",
            "mailto:contact@mail.thesammy2010.com?subject=Privacy"
        )
    })

    it("covers signing in with Apple and Hide My Email", () => {
        render(
            <MemoryRouter>
                <Privacy />
            </MemoryRouter>
        )

        expect(screen.getByText(/You sign in with Google or with Apple/)).toBeInTheDocument()
        expect(screen.getByText(/Hide My Email/)).toBeInTheDocument()
    })
})
