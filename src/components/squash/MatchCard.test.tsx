import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import MatchCard from "./MatchCard"
import { Match, Player } from "./api"

const players: Player[] = [
    { id: "a", name: "Alex", user_id: null, email: null, is_active: true },
    { id: "b", name: "Sam", user_id: null, email: null, is_active: true }
]

function match(overrides: Partial<Match> = {}): Match {
    return {
        id: "m",
        format: "singles",
        status: "completed",
        played_at: null,
        venue: "Club",
        venue_id: "v",
        points_to: 11,
        best_of: 1,
        notes: null,
        is_unranked: false,
        hidden: false,
        players: [
            { player_id: "a", side: 1 },
            { player_id: "b", side: 2 }
        ],
        games: [{ number: 1, side1_points: 11, side2_points: 5, winning_side: 1, rallies: 0 }],
        side1_games: 1,
        side2_games: 0,
        winning_side: 1,
        serving_side: null,
        version: 1,
        created_by_id: "u",
        created_at: "2026-11-20T10:00:00",
        ...overrides
    }
}

function renderCard(m: Match) {
    render(
        <MemoryRouter>
            <MatchCard match={m} players={players} me={null} />
        </MemoryRouter>
    )
}

describe("MatchCard", () => {
    it("shows the result of a ranked match without a badge", () => {
        renderCard(match())

        expect(screen.getByText("🏆 Won")).toBeInTheDocument()
        expect(screen.queryByText("Unranked")).not.toBeInTheDocument()
    })

    it("marks an unranked match, still with its result", () => {
        renderCard(match({ is_unranked: true }))

        expect(screen.getByText("Unranked")).toBeInTheDocument()
        expect(screen.getByText("🏆 Won")).toBeInTheDocument()
    })
})
