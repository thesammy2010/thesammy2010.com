import React from "react"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import PageHead, { titleFor } from "./PageHead"

describe("titleFor", () => {
    it("names the squash pages How2Squash", () => {
        expect(titleFor("/squash")).toBe("How2Squash")
        expect(titleFor("/squash/matches/m/games/2")).toBe("How2Squash")
    })

    it("names everything else after the site", () => {
        expect(titleFor("/")).toBe("TheSammy2010")
        expect(titleFor("/go-heavier")).toBe("TheSammy2010")
        expect(titleFor("/squashed")).toBe("TheSammy2010")
    })
})

describe("PageHead", () => {
    // The head's links aren't on the page for Testing Library's queries
    // eslint-disable-next-line testing-library/no-node-access
    const icon = () => document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')!

    beforeEach(() => {
        document.head.innerHTML = '<link rel="icon" type="image/x-icon" href="/icons/favicon.ico">'
    })

    const renderAt = (path: string) =>
        render(
            <MemoryRouter initialEntries={[path]}>
                <PageHead />
            </MemoryRouter>
        )

    it("gives a squash page How2Squash's title and icon", () => {
        renderAt("/squash/stats")

        expect(document.title).toBe("How2Squash")
        expect(icon()).toHaveAttribute("href", "/icons/how2squash-32.png")
        expect(icon()).toHaveAttribute("type", "image/png")
    })

    it("puts the site's own back elsewhere", () => {
        renderAt("/squash").unmount()
        renderAt("/about")

        expect(document.title).toBe("TheSammy2010")
        expect(icon()).toHaveAttribute("href", "/icons/favicon.ico")
        expect(icon()).toHaveAttribute("type", "image/x-icon")
    })
})
