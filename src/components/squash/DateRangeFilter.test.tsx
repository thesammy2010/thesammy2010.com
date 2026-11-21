import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import DateRangeFilter from "./DateRangeFilter"

describe("DateRangeFilter", () => {
    it("names the range, and picks a preset from the panel", async () => {
        const onChange = jest.fn()
        render(<DateRangeFilter range={{ from: "", to: "" }} onChange={onChange} />)

        await userEvent.click(screen.getByRole("button", { name: "When: Any time" }))
        await userEvent.click(screen.getByRole("button", { name: "This month" }))

        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: expect.stringMatching(/-01$/) }))
        expect(screen.queryByRole("group", { name: "When played" })).not.toBeInTheDocument()
    })

    it("takes dates of its own", async () => {
        const onChange = jest.fn()
        render(<DateRangeFilter range={{ from: "2025-11-03", to: "2025-11-15" }} onChange={onChange} />)

        await userEvent.click(screen.getByRole("button", { name: "When: 3–15 Nov 2025" }))
        expect(screen.getByLabelText("From")).toHaveValue("2025-11-03")
        await userEvent.keyboard("{Escape}")
        expect(screen.queryByLabelText("From")).not.toBeInTheDocument()
    })
})
