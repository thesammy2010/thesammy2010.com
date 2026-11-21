import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import LiveScorer from "./LiveScorer"
import { Match, Player } from "./api"

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
})
