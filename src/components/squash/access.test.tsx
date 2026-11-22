import React from "react"
import { render, screen } from "@testing-library/react"

// Its own file, as the membership check is kept for the whole page.
import { useSquashAccess } from "./api"

function Status({ name }: { name: string }) {
    return <p>{`${name}: ${useSquashAccess().status}`}</p>
}

describe("useSquashAccess", () => {
    it("tells every component on the page, signed out, not just the first to check", async () => {
        // The nav bar and the page draw together, both before the check. The
        // nav bar's starts it, and with no one signed in it's answered at
        // once, before the page is listening, which once left the page on
        // its spinner.
        render(
            <>
                <Status name="nav" />
                <Status name="page" />
            </>
        )
        expect(await screen.findByText("nav: signedOut")).toBeInTheDocument()
        expect(await screen.findByText("page: signedOut")).toBeInTheDocument()
    })
})
