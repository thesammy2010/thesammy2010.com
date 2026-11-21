import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

import { ApiError } from "../../configs"
import { Comment, Match, squashApi } from "./api"
import Comments from "./Comments"

jest.mock("../../roles", () => ({
    useOwnUserId: () => "u1",
    useIsAdmin: () => false
}))

const match = {
    id: "m",
    games: [
        { number: 1, side1_points: 11, side2_points: 9, winning_side: 1, rallies: 20 },
        { number: 2, side1_points: 4, side2_points: 6, winning_side: null, rallies: 10 }
    ]
} as unknown as Match

function comment(overrides: Partial<Comment>): Comment {
    return {
        id: "c",
        match_id: "m",
        game: null,
        body: "Good match",
        user_id: "u1",
        player_id: "p1",
        author: "Alex",
        created_at: "2026-11-21T20:00:00",
        edited_at: null,
        ...overrides
    }
}

const said = [
    comment({ id: "c1", body: "Good match" }),
    comment({ id: "c2", game: 2, body: "What a rally at 4-4", user_id: "u2", author: "Sam" })
]

function renderComments(game?: number) {
    render(
        <MemoryRouter>
            <Comments match={match} game={game} />
        </MemoryRouter>
    )
}

afterEach(() => jest.restoreAllMocks())

describe("Comments", () => {
    it("shows the whole match's, marking a game's, with Edit only on your own", async () => {
        jest.spyOn(squashApi, "comments").mockResolvedValue(said)
        renderComments()

        const items = await screen.findAllByRole("listitem")
        expect(items).toHaveLength(2)
        expect(within(items[0]).getByRole("button", { name: "Edit" })).toBeInTheDocument()
        expect(within(items[1]).getByRole("link", { name: "Game 2" })).toHaveAttribute(
            "href",
            "/squash/matches/m/games/2"
        )
        expect(within(items[1]).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
    })

    it("on a game's page, shows only its comments and posts about it", async () => {
        jest.spyOn(squashApi, "comments").mockResolvedValue(said)
        const add = jest
            .spyOn(squashApi, "addComment")
            .mockResolvedValue(comment({ id: "c3", game: 2, body: "Close one" }))
        renderComments(2)

        expect(await screen.findByText("What a rally at 4-4")).toBeInTheDocument()
        expect(screen.queryByText("Good match")).not.toBeInTheDocument()

        await userEvent.type(screen.getByLabelText("Your comment"), "  Close one ")
        await userEvent.click(screen.getByRole("button", { name: "Post" }))

        expect(add).toHaveBeenCalledWith("m", "Close one", 2)
        expect(await screen.findByText("Close one")).toBeInTheDocument()
    })

    it("posts about a game picked on the match's page", async () => {
        jest.spyOn(squashApi, "comments").mockResolvedValue([])
        const add = jest.spyOn(squashApi, "addComment").mockResolvedValue(comment({ id: "c4", game: 1 }))
        renderComments()

        await userEvent.selectOptions(await screen.findByLabelText("About"), "1")
        await userEvent.type(screen.getByLabelText("Your comment"), "Tight first game")
        await userEvent.click(screen.getByRole("button", { name: "Post" }))

        expect(add).toHaveBeenCalledWith("m", "Tight first game", 1)
    })

    it("deletes your own after asking", async () => {
        jest.spyOn(squashApi, "comments").mockResolvedValue(said)
        const remove = jest.spyOn(squashApi, "deleteComment").mockResolvedValue(undefined)
        renderComments()

        const [mine] = await screen.findAllByRole("listitem")
        await userEvent.click(within(mine).getByRole("button", { name: "Delete" }))
        await userEvent.click(within(mine).getByRole("button", { name: "Delete" }))

        expect(remove).toHaveBeenCalledWith("m", "c1")
        await waitFor(() => expect(screen.queryByText("Good match")).not.toBeInTheDocument())
    })

    it("shows nothing from an API without comments", async () => {
        jest.spyOn(squashApi, "comments").mockRejectedValue(new ApiError(404, "Not Found"))
        renderComments()

        expect(screen.getByText("Loading comments...")).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByRole("region", { name: "Comments" })).not.toBeInTheDocument())
    })
})
