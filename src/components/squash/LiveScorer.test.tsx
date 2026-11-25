import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import LiveScorer from "./LiveScorer"
import { Match, Player, squashApi } from "./api"

const players: Player[] = [
    { id: "a", name: "Alex", user_id: null, email: null, is_active: true, preferred_box: "left" },
    { id: "b", name: "Sam", user_id: null, email: null, is_active: true }
]

// A match about to start, with the API's spin given to side 2
const match: Match = {
    id: "m",
    format: "singles",
    status: "in_progress",
    played_at: null,
    venue: "Club",
    venue_id: "v",
    points_to: 11,
    best_of: 3,
    notes: null,
    is_private: false,
    hidden: false,
    players: [
        { player_id: "a", side: 1 },
        { player_id: "b", side: 2 }
    ],
    games: [{ number: 1, side1_points: 0, side2_points: 0, winning_side: null, rallies: 0 }],
    side1_games: 0,
    side2_games: 0,
    winning_side: null,
    serving_side: 2,
    version: 1,
    created_by_id: "u",
    created_at: "2026-11-21T10:00:00"
}

// The server and their box are the bold words in "Sam to serve from the right box"
const expectServing = (name: string, box: string) => {
    expect(screen.getByText(name, { selector: "strong" })).toBeInTheDocument()
    expect(screen.getByText(box, { selector: "strong" })).toBeInTheDocument()
}

describe("LiveScorer", () => {
    it("serves first from the API's spin, and Change swaps it", async () => {
        render(<LiveScorer match={match} rallies={[]} players={players} onMatch={jest.fn()} />)

        expectServing("Sam", "right")
        await userEvent.click(screen.getByRole("button", { name: "Change" }))
        // Alex prefers the left
        expectServing("Alex", "left")
        await userEvent.click(screen.getByRole("button", { name: "Change" }))
        expectServing("Sam", "right")
    })

    it("asks who serves first when the API hasn't spun", async () => {
        render(
            <LiveScorer match={{ ...match, serving_side: null }} rallies={[]} players={players} onMatch={jest.fn()} />
        )

        await userEvent.click(screen.getByRole("button", { name: "Alex" }))
        expectServing("Alex", "left")
    })

    it("lets either side serve first as a later game starts, and sends who did", async () => {
        // Alex won game 1, so by taking turns Sam serves first in game 2
        const second: Match = {
            ...match,
            games: [{ number: 1, side1_points: 11, side2_points: 3, winning_side: 1, rallies: 14 }],
            side1_games: 1
        }
        const addRally = jest.spyOn(squashApi, "addRally").mockResolvedValue(second)
        render(<LiveScorer match={second} rallies={[]} players={players} onMatch={jest.fn()} />)

        expectServing("Sam", "right")
        await userEvent.click(screen.getByRole("button", { name: "Change" }))
        expectServing("Alex", "left")
        await userEvent.click(screen.getByRole("button", { name: /^Point to Alex/ }))
        expect(addRally).toHaveBeenCalledWith("m", expect.objectContaining({ server_id: "a", box: "left" }), 1)
        addRally.mockRestore()
    })

    it("can't change who serves first once a point's been won in the game", () => {
        const playing: Match = {
            ...match,
            games: [{ number: 1, side1_points: 0, side2_points: 1, winning_side: null, rallies: 1 }]
        }
        render(<LiveScorer match={playing} rallies={[]} players={players} onMatch={jest.fn()} />)

        expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument()
    })

    it("offers the referee's calls with advanced tracking", () => {
        render(<LiveScorer match={match} rallies={[]} players={players} onMatch={jest.fn()} />)

        expect(screen.getAllByRole("button", { name: "Let" })).toHaveLength(2)
        expect(screen.getAllByRole("button", { name: "Stroke" })).toHaveLength(2)
    })

    it("offers no calls without advanced tracking", () => {
        const untracked: Match = { ...match, advanced_tracking: false }
        render(<LiveScorer match={untracked} rallies={[]} players={players} onMatch={jest.fn()} />)

        expect(screen.queryByRole("button", { name: "Let" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Stroke" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "No let" })).not.toBeInTheDocument()
    })

    it("takes tracks_box false from an API from before as no advanced tracking", () => {
        const untracked: Match = { ...match, tracks_box: false }
        render(<LiveScorer match={untracked} rallies={[]} players={players} onMatch={jest.fn()} />)

        expect(screen.queryByRole("button", { name: "Let" })).not.toBeInTheDocument()
    })

    it("shows and sends no box without advanced tracking", async () => {
        const untracked: Match = { ...match, advanced_tracking: false }
        const addRally = jest.spyOn(squashApi, "addRally").mockResolvedValue(untracked)
        render(<LiveScorer match={untracked} rallies={[]} players={players} onMatch={jest.fn()} />)

        expect(screen.getByText("Sam", { selector: "strong" })).toBeInTheDocument()
        expect(screen.queryByText("right", { selector: "strong" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Switch box" })).not.toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: /^Point to Sam/ }))
        expect(addRally).toHaveBeenCalledWith("m", expect.objectContaining({ box: null }), 1)
        addRally.mockRestore()
    })

    describe("with the API saying which box", () => {
        const synced: Match = { ...match, serving_box: "left", can_choose_box: true }

        it("shows the API's box over the server's preference", () => {
            render(<LiveScorer match={synced} rallies={[]} players={players} onMatch={jest.fn()} />)

            expectServing("Sam", "left")
        })

        it("switches the box through the API, for every scorer to show", async () => {
            const switched: Match = { ...synced, serving_box: "right", version: 2 }
            const chooseBox = jest.spyOn(squashApi, "chooseBox").mockResolvedValue(switched)
            const onMatch = jest.fn()
            render(<LiveScorer match={synced} rallies={[]} players={players} onMatch={onMatch} />)

            await userEvent.click(screen.getByRole("button", { name: "Switch box" }))
            expect(chooseBox).toHaveBeenCalledWith("m", "right", 1)
            await waitFor(() => expect(onMatch).toHaveBeenCalledWith(switched))
            chooseBox.mockRestore()
        })

        it("sends the API's box with the rally", async () => {
            const addRally = jest.spyOn(squashApi, "addRally").mockResolvedValue(synced)
            render(<LiveScorer match={synced} rallies={[]} players={players} onMatch={jest.fn()} />)

            await userEvent.click(screen.getByRole("button", { name: /^Point to Sam/ }))
            expect(addRally).toHaveBeenCalledWith("m", expect.objectContaining({ box: "left" }), 1)
            addRally.mockRestore()
        })

        it("can't switch once the server's won a point in the hand", () => {
            render(
                <LiveScorer
                    match={{ ...synced, can_choose_box: false }}
                    rallies={[]}
                    players={players}
                    onMatch={jest.fn()}
                />
            )

            expectServing("Sam", "left")
            expect(screen.queryByRole("button", { name: "Switch box" })).not.toBeInTheDocument()
        })

        it("works the box out itself for the other side picked to serve first", async () => {
            render(<LiveScorer match={synced} rallies={[]} players={players} onMatch={jest.fn()} />)

            await userEvent.click(screen.getByRole("button", { name: "Change" }))
            // Alex prefers the left, which the API, with Sam serving, can't know
            expectServing("Alex", "left")
        })
    })
})
