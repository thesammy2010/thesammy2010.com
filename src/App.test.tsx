import React from "react"
import { render, screen } from "@testing-library/react"
import App from "./App"

describe("App", () => {
    it("renders the home page at the root", () => {
        render(<App />)

        expect(screen.getAllByRole("img", { name: /thesammy2010 logo/i }).length).toBeGreaterThan(0)
    })

    it("offers the top level navigation", () => {
        render(<App />)

        expect(screen.getByRole("link", { name: /go heavier/i })).toHaveAttribute("href", "/go-heavier")
        expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about")
    })
})
