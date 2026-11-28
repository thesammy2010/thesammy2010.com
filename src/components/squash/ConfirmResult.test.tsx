import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ConfirmResult from "./ConfirmResult"
import { counts, Match, Player, squashApi } from "./api"

const players: Player[] = [
    { id: "a", name: "Alex", user_id: "u1", email: null, is_active: true },
    { id: "b", name: "Sam", user_id: "u2", email: null, is_active: true }
]

const pending: Match = {
    id: "m",
    format: "singles",
    status: "completed",
    played_at: null,
    venue: null,
    venue_id: null,
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
    version: 3,
    created_by_id: "u1",
    created_at: "2026-11-23T10:00:00",
    confirmation: "pending",
    awaiting_sides: [2],
    can_confirm: true
}

describe("ConfirmResult", () => {
    it("says who it's waiting on, and confirms it for them", async () => {
        const confirmed: Match = { ...pending, confirmation: "confirmed", awaiting_sides: [], version: 4 }
        const confirm = jest.spyOn(squashApi, "confirmResult").mockResolvedValue(confirmed)
        const onMatch = jest.fn()
        render(<ConfirmResult match={pending} players={players} onMatch={onMatch} />)

        expect(screen.getByText(/once Sam confirm it/)).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: /Confirm the result/ }))
        expect(confirm).toHaveBeenCalledWith("m", 3)
        await waitFor(() => expect(onMatch).toHaveBeenCalledWith(confirmed))
        confirm.mockRestore()
    })

    it("only waits, for someone who can't confirm it", () => {
        render(<ConfirmResult match={{ ...pending, can_confirm: false }} players={players} onMatch={jest.fn()} />)

        expect(screen.queryByRole("button", { name: /Confirm/ })).not.toBeInTheDocument()
    })

    it("disputes it with a reason", async () => {
        const dispute = jest
            .spyOn(squashApi, "disputeResult")
            .mockResolvedValue({ ...pending, confirmation: "disputed" })
        render(<ConfirmResult match={pending} players={players} onMatch={jest.fn()} />)

        await userEvent.click(screen.getByRole("button", { name: "Dispute it" }))
        await userEvent.type(screen.getByLabelText("What's wrong with it?"), "It was 11-9")
        await userEvent.click(screen.getByRole("button", { name: "Dispute the result" }))
        expect(dispute).toHaveBeenCalledWith("m", 3, "It was 11-9")
        dispute.mockRestore()
    })

    it("counts only confirmed results, and every result from an API from before", () => {
        expect(counts(pending)).toBe(false)
        expect(counts({ ...pending, confirmation: "confirmed" })).toBe(true)
        expect(counts({ ...pending, confirmation: undefined })).toBe(true)
        expect(counts({ ...pending, status: "in_progress", confirmation: null })).toBe(false)
    })
})
