import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Player, squashApi } from "./api"
import ServePreference from "./ServePreference"

const alex: Player = {
    id: "p1",
    name: "Alex",
    user_id: "u1",
    email: null,
    is_active: true,
    preferred_box: null
}

afterEach(() => jest.restoreAllMocks())

describe("ServePreference", () => {
    it("saves the box you choose", async () => {
        const save = jest.spyOn(squashApi, "setMyPreferences").mockResolvedValue({ ...alex, preferred_box: "left" })
        render(<ServePreference player={alex} mine />)

        expect(screen.getByRole("radio", { name: "No preference" })).toHaveAttribute("aria-checked", "true")
        await userEvent.click(screen.getByRole("radio", { name: "Left" }))

        expect(save).toHaveBeenCalledWith({ preferred_box: "left" })
        await waitFor(() => expect(screen.getByRole("radio", { name: "Left" })).toHaveAttribute("aria-checked", "true"))
    })

    it("goes back to what it was when the save fails", async () => {
        jest.spyOn(squashApi, "setMyPreferences").mockRejectedValue(new Error("Failed to save your preference"))
        render(<ServePreference player={{ ...alex, preferred_box: "right" }} mine />)

        await userEvent.click(screen.getByRole("radio", { name: "Left" }))

        expect(await screen.findByText("Failed to save your preference")).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: "Right" })).toHaveAttribute("aria-checked", "true")
    })

    it("only shows someone else's, and only when they have one", () => {
        const { rerender } = render(<ServePreference player={{ ...alex, preferred_box: "left" }} mine={false} />)
        expect(screen.getByText("Likes to serve from the left box")).toBeInTheDocument()
        expect(screen.queryByRole("radio")).not.toBeInTheDocument()

        rerender(<ServePreference player={alex} mine={false} />)
        expect(screen.queryByText(/Likes to serve/)).not.toBeInTheDocument()
    })
})
