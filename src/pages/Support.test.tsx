import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import Support, { SUPPORT_EMAIL } from "./Support"

describe("Support", () => {
    it("gives the support email and links the privacy policy", () => {
        render(
            <MemoryRouter>
                <Support />
            </MemoryRouter>
        )

        expect(SUPPORT_EMAIL).toBe("how2squash@mail.thesammy2010.com")
        expect(screen.getAllByRole("link", { name: SUPPORT_EMAIL })[0]).toHaveAttribute(
            "href",
            expect.stringContaining(`mailto:${SUPPORT_EMAIL}`)
        )
        expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy")
        expect(screen.getByRole("heading", { name: "Keeping it friendly" })).toBeInTheDocument()
    })
})
