import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import { Match, Player } from "./api"
import SimpleViewOffer from "./SimpleViewOffer"

const me = { id: "me", name: "Leo" } as Player
const match = (status: Match["status"], playerId = "me") =>
    ({ status, players: [{ player_id: playerId, side: 1 }] }) as unknown as Match

describe("SimpleViewOffer", () => {
    beforeEach(() => localStorage.clear())

    it("offers the simple view after a finished match you played, once", () => {
        const { rerender } = render(<SimpleViewOffer match={match("completed")} me={me} />)

        fireEvent.click(screen.getByRole("button", { name: "Simple view" }))

        expect(localStorage.getItem("squash.simpleView")).toBe("true")
        rerender(<SimpleViewOffer match={match("completed")} me={me} />)
        expect(screen.queryByText("Keep it simple?")).not.toBeInTheDocument()
    })

    it("keeps everything when asked to, and doesn't ask again", () => {
        render(<SimpleViewOffer match={match("completed")} me={me} />)

        fireEvent.click(screen.getByRole("button", { name: "Show everything" }))

        expect(localStorage.getItem("squash.simpleView")).toBeNull()
        expect(screen.queryByText("Keep it simple?")).not.toBeInTheDocument()
    })

    it("isn't offered for a match you didn't play, or one not finished", () => {
        render(
            <>
                <SimpleViewOffer match={match("completed", "someone")} me={me} />
                <SimpleViewOffer match={match("in_progress")} me={me} />
            </>
        )

        expect(screen.queryByText("Keep it simple?")).not.toBeInTheDocument()
    })
})
