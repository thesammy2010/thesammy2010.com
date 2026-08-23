import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import About from "./About"

function renderAbout() {
    render(
        <MemoryRouter>
            <About />
        </MemoryRouter>
    )
}

describe("About", () => {
    it("leads with the page heading", () => {
        renderAbout()

        expect(screen.getByRole("heading", { level: 1, name: /about this site/i })).toBeInTheDocument()
    })

    it("links through to Go Heavier", () => {
        renderAbout()

        expect(screen.getByRole("link", { name: /go heavier/i })).toHaveAttribute("href", "/go-heavier")
    })

    it("opens the source link in a new tab safely", () => {
        renderAbout()

        const source = screen.getByRole("link", { name: /github/i })
        expect(source).toHaveAttribute("target", "_blank")
        expect(source).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    })
})
