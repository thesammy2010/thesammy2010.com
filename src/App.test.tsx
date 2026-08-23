import React from "react"
import { render, screen } from "@testing-library/react"
import App from "./App"

describe("App", () => {
    it("renders the home page at the root", () => {
        render(<App />)

        expect(screen.getByRole("heading", { name: /thesammy2010/i })).toBeInTheDocument()
    })

    it("offers the top level navigation", () => {
        render(<App />)

        expect(screen.getByRole("link", { name: /go heavier/i })).toHaveAttribute("href", "/go-heavier")
        expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about")
    })
})
