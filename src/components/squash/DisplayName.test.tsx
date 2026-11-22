import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Player, squashApi } from "./api"
import DisplayName from "./DisplayName"

const alex: Player = { id: "p1", name: "Alex", user_id: "u1", email: null, is_active: true }

afterEach(() => jest.restoreAllMocks())

describe("DisplayName", () => {
    it("saves your new name, trimmed", async () => {
        const save = jest.spyOn(squashApi, "setMyPreferences").mockResolvedValue({ ...alex, name: "Alexa" })
        const onSaved = jest.fn()
        render(<DisplayName player={alex} onSaved={onSaved} />)

        await userEvent.click(screen.getByRole("button", { name: "Change name" }))
        const input = screen.getByLabelText("Name in the group")
        await userEvent.clear(input)
        await userEvent.type(input, "  Alexa ")
        await userEvent.click(screen.getByRole("button", { name: "Save" }))

        expect(save).toHaveBeenCalledWith({ name: "Alexa" })
        await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...alex, name: "Alexa" }))
        expect(screen.getByRole("button", { name: "Change name" })).toBeInTheDocument()
    })

    it("won't save a blank or unchanged name", async () => {
        const save = jest.spyOn(squashApi, "setMyPreferences")
        render(<DisplayName player={alex} onSaved={jest.fn()} />)

        await userEvent.click(screen.getByRole("button", { name: "Change name" }))
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
        await userEvent.clear(screen.getByLabelText("Name in the group"))
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
        expect(save).not.toHaveBeenCalled()
    })

    it("keeps the form open with the reason when it fails", async () => {
        jest.spyOn(squashApi, "setMyPreferences").mockRejectedValue(new Error("Failed to save your preference"))
        render(<DisplayName player={alex} onSaved={jest.fn()} />)

        await userEvent.click(screen.getByRole("button", { name: "Change name" }))
        await userEvent.type(screen.getByLabelText("Name in the group"), "a")
        await userEvent.click(screen.getByRole("button", { name: "Save" }))

        expect(await screen.findByText("Failed to save your preference")).toBeInTheDocument()
        expect(screen.getByLabelText("Name in the group")).toHaveValue("Alexa")
    })
})
