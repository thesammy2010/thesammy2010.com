import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import NavBar from "./NavBar"

function renderAt(path: string) {
    render(
        <MemoryRouter initialEntries={[path]}>
            <NavBar />
        </MemoryRouter>
    )
}

describe("NavBar", () => {
    it("links home and to each section", () => {
        renderAt("/")

        expect(screen.getByRole("link", { name: /thesammy2010 logo/i })).toHaveAttribute("href", "/")
        expect(screen.getByRole("link", { name: "Go Heavier" })).toHaveAttribute("href", "/go-heavier")
        expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about")
    })

    it("marks nothing active on the home page", () => {
        renderAt("/")

        expect(screen.getByRole("link", { name: "Go Heavier" })).not.toHaveClass("active")
        expect(screen.getByRole("link", { name: "About" })).not.toHaveClass("active")
    })

    it("marks the section you are in", () => {
        renderAt("/about")

        expect(screen.getByRole("link", { name: "About" })).toHaveClass("active")
        expect(screen.getByRole("link", { name: "Go Heavier" })).not.toHaveClass("active")
    })

    // Every Go Heavier page sits under the section, so the section stays lit.
    it("stays active on a nested page", () => {
        renderAt("/go-heavier/sessions/abc-123")

        expect(screen.getByRole("link", { name: "Go Heavier" })).toHaveClass("active")
    })

    it("does not light a section for a path that merely shares its prefix", () => {
        renderAt("/go-heavier-extra")

        expect(screen.getByRole("link", { name: "Go Heavier" })).not.toHaveClass("active")
    })
})
