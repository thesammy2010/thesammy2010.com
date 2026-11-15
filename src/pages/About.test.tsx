import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import About from "./About"

let mockCanAccess = false
jest.mock("../roles", () => ({
    useCanAccess: () => mockCanAccess
}))

jest.mock("../components/squash/api", () => ({
    useSquashAccess: () => ({ status: "signedOut" })
}))

function renderAbout() {
    render(
        <MemoryRouter>
            <About />
        </MemoryRouter>
    )
}

describe("About", () => {
    beforeEach(() => {
        mockCanAccess = false
    })

    it("leads with the page heading", () => {
        renderAbout()

        expect(screen.getByRole("heading", { level: 1, name: /about this site/i })).toBeInTheDocument()
    })

    // Go Heavier and Finance are admin-only, so a visitor sees neither.
    it("tells a visitor the sections are private", () => {
        renderAbout()

        expect(screen.queryByRole("link", { name: /go heavier/i })).not.toBeInTheDocument()
        expect(screen.getByText(/sign in to see the ones you can use/i)).toBeInTheDocument()
    })

    it("links through to Go Heavier for someone who can open it", () => {
        mockCanAccess = true
        renderAbout()

        expect(screen.getByRole("link", { name: /go heavier/i })).toHaveAttribute("href", "/go-heavier")
    })

    // Finance is personal data, so it isn't advertised to everyone.
    it("only mentions Finance to someone who can open it", () => {
        renderAbout()
        expect(screen.queryByRole("link", { name: /finance/i })).not.toBeInTheDocument()
    })

    it("links through to Finance for someone who can open it", () => {
        mockCanAccess = true
        renderAbout()

        expect(screen.getByRole("link", { name: /finance/i })).toHaveAttribute("href", "/finance")
    })

    it("opens both source links in a new tab safely", () => {
        renderAbout()

        const website = screen.getByRole("link", { name: "the website" })
        const api = screen.getByRole("link", { name: "the API" })
        expect(website).toHaveAttribute("href", "https://github.com/thesammy2010/thesammy2010.com")
        expect(api).toHaveAttribute("href", "https://github.com/thesammy2010/api.thesammy2010.com")
        for (const source of [website, api]) {
            expect(source).toHaveAttribute("target", "_blank")
            expect(source).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
        }
    })
})
