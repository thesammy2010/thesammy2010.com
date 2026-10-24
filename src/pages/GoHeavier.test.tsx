import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { GoHeavier } from "./GoHeavier"

jest.mock("../roles", () => ({
    canAccess: () => true,
    useCanAccess: () => true,
    isSignedIn: () => true,
    subscribeAccess: () => () => {},
    subscribeAccessReady: () => () => {}
}))

jest.mock("../auth", () => ({
    apiFetch: jest.fn()
}))

jest.mock("../components/go_heavier/sessions", () => ({
    fetchAllSessions: jest.fn()
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { apiFetch } = require("../auth")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetchAllSessions } = require("../components/go_heavier/sessions")

describe("GoHeavier autoFetch", () => {
    beforeEach(() => {
        apiFetch.mockReset()
        apiFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
        fetchAllSessions.mockReset()
        fetchAllSessions.mockResolvedValue([])
    })

    // subscribeAccessReady and subscribeAccess both call autoFetch for the
    // same access-ready transition - synchronously, before fetchCounts has
    // resolved and flipped state.loaded. This reproduces that exact race
    // (two autoFetch calls back to back, neither awaited in between) and
    // asserts it doesn't double every request - the bug that shipped as a
    // visible doubled network tab for every paginated endpoint.
    it("does not fetch twice when autoFetch is re-entered before the first call settles", async () => {
        const ref = React.createRef<GoHeavier>()
        render(
            <MemoryRouter>
                <GoHeavier navigate={() => {}} ref={ref} />
            </MemoryRouter>
        )

        act(() => {
            ref.current!.autoFetch()
            ref.current!.autoFetch()
        })

        // Let both fetchCounts calls (if there were two) run to completion.
        await waitFor(() => expect(ref.current!.state.loaded).toBe(true))

        expect(fetchAllSessions).toHaveBeenCalledTimes(1)
        expect(apiFetch).toHaveBeenCalledTimes(2) // locations + exercises, once each
    })
})
