import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import NavBar from "./NavBar"

// Go Heavier is admin-only, so most of these render as someone who can open
// it; the visitor's view is checked on its own below.
let mockCanAccess = true
jest.mock("../roles", () => ({
    useCanAccess: () => mockCanAccess,
    useIsAdmin: () => false
}))

let mockSquashAccess = "signedOut"
jest.mock("./squash/api", () => ({
    useSquashAccess: () => ({ status: mockSquashAccess })
}))

beforeEach(() => {
    mockCanAccess = true
    mockSquashAccess = "signedOut"
})

function renderAt(path: string) {
    render(
        <GoogleOAuthProvider clientId="test-client-id">
            <MemoryRouter initialEntries={[path]}>
                <NavBar />
            </MemoryRouter>
        </GoogleOAuthProvider>
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

    it("hides admin-only sections from someone who can't open them", () => {
        mockCanAccess = false
        renderAt("/")

        expect(screen.queryByRole("link", { name: "Go Heavier" })).not.toBeInTheDocument()
        expect(screen.queryByRole("link", { name: "Finance" })).not.toBeInTheDocument()
        expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument()
    })

    // Signed in but not a player: squash is where they ask to join.
    it.each(["member", "denied"])("offers squash to someone who's %s", (status) => {
        mockSquashAccess = status
        renderAt("/")

        expect(screen.getByRole("link", { name: "Squash" })).toHaveAttribute("href", "/squash")
    })

    it("hides squash when signed out", () => {
        renderAt("/")

        expect(screen.queryByRole("link", { name: "Squash" })).not.toBeInTheDocument()
    })
})
