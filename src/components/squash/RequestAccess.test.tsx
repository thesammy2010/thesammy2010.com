import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import RequestAccess from "./RequestAccess"
import { AccessRequest } from "./api"

const mockApi = {
    myAccessRequest: jest.fn(),
    requestAccess: jest.fn(),
    withdrawAccessRequest: jest.fn()
}
const mockRecheck = jest.fn()
jest.mock("./api", () => ({
    squashApi: {
        myAccessRequest: () => mockApi.myAccessRequest(),
        requestAccess: (message: string | null) => mockApi.requestAccess(message),
        withdrawAccessRequest: () => mockApi.withdrawAccessRequest()
    },
    recheckSquashAccess: () => mockRecheck()
}))

const request = (changes: Partial<AccessRequest> = {}): AccessRequest => ({
    id: "r1",
    status: "pending",
    message: null,
    player_id: null,
    reviewed_at: null,
    created_at: "2026-11-20T10:00:00",
    ...changes
})

beforeEach(() => {
    jest.resetAllMocks()
})

describe("RequestAccess", () => {
    it("asks to join with a message", async () => {
        mockApi.myAccessRequest.mockResolvedValue(null)
        mockApi.requestAccess.mockResolvedValue(request({ message: "I play with Sam" }))
        render(<RequestAccess />)

        fireEvent.change(await screen.findByLabelText("Message"), { target: { value: "  I play with Sam " } })
        fireEvent.click(screen.getByRole("button", { name: "Ask to join" }))

        expect(await screen.findByText(/You asked to join on/)).toBeInTheDocument()
        expect(mockApi.requestAccess).toHaveBeenCalledWith("I play with Sam")
        expect(screen.getByText("I play with Sam")).toBeInTheDocument()
    })

    it("withdraws a waiting request", async () => {
        mockApi.myAccessRequest.mockResolvedValue(request())
        mockApi.withdrawAccessRequest.mockResolvedValue(undefined)
        render(<RequestAccess />)

        fireEvent.click(await screen.findByRole("button", { name: "Withdraw request" }))

        expect(await screen.findByRole("button", { name: "Ask to join" })).toBeInTheDocument()
    })

    it("lets someone declined clear it and ask again", async () => {
        mockApi.myAccessRequest.mockResolvedValue(request({ status: "declined", reviewed_at: "2026-11-21T10:00:00" }))
        mockApi.withdrawAccessRequest.mockResolvedValue(undefined)
        render(<RequestAccess />)

        expect(await screen.findByText(/An admin declined your request/)).toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: "Clear and ask again" }))

        expect(await screen.findByRole("button", { name: "Ask to join" })).toBeInTheDocument()
    })

    it("checks membership again once approved", async () => {
        mockApi.myAccessRequest
            .mockResolvedValueOnce(request())
            .mockResolvedValueOnce(request({ status: "approved", player_id: "p1" }))
        render(<RequestAccess />)

        fireEvent.click(await screen.findByRole("button", { name: "Check again" }))

        await screen.findByRole("button", { name: "Ask to join" })
        expect(mockRecheck).toHaveBeenCalled()
    })

    it("shows why asking failed", async () => {
        mockApi.myAccessRequest.mockResolvedValue(null)
        mockApi.requestAccess.mockRejectedValue(new Error("You're already in the squash group"))
        render(<RequestAccess />)

        fireEvent.click(await screen.findByRole("button", { name: "Ask to join" }))

        expect(await screen.findByText("You're already in the squash group")).toBeInTheDocument()
    })
})
