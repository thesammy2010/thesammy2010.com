import React from "react"
import { render, screen } from "@testing-library/react"
import App from "./App"

describe("App", () => {
    it("renders the home page at the root", () => {
        render(<App />)

        expect(screen.getAllByRole("img", { name: /thesammy2010 logo/i }).length).toBeGreaterThan(0)
    })

    // A signed-out visitor can't open the admin-only sections, so they
    // aren't offered them.
    it("offers a visitor only what they can open", () => {
        render(<App />)

        expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about")
        expect(screen.queryByRole("link", { name: /go heavier/i })).not.toBeInTheDocument()
        expect(screen.queryByRole("link", { name: /finance/i })).not.toBeInTheDocument()
        expect(screen.queryByRole("link", { name: /squash/i })).not.toBeInTheDocument()
    })
})
