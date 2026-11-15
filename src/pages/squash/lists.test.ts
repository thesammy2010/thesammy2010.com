import type { Match, Player, PlayerStats } from "../../components/squash/api"
import { liveFirst } from "../Squash"
import { ladder } from "./Players"

jest.mock("../../components/squash/api", () => ({}))

describe("liveFirst", () => {
    it("puts matches in progress first and keeps the rest in order", () => {
        const matches = [
            { id: "1", status: "completed" },
            { id: "2", status: "in_progress" },
            { id: "3", status: "scheduled" },
            { id: "4", status: "in_progress" }
        ] as Match[]
        expect(liveFirst(matches).map((m) => m.id)).toEqual(["2", "4", "1", "3"])
    })
})

describe("ladder", () => {
    it("ranks by wins, then win rate, then name", () => {
        const players = [
            { id: "a", name: "Zed" },
            { id: "b", name: "Amy" },
            { id: "c", name: "Bob" },
            { id: "d", name: "Cat" }
        ] as Player[]
        const stats = {
            a: { matches_won: 3, win_rate: 0.5 },
            b: { matches_won: 3, win_rate: 0.75 },
            c: { matches_won: 0, win_rate: null },
            d: { matches_won: 0, win_rate: null }
        } as unknown as Record<string, PlayerStats>
        expect(ladder(players, stats).map((p) => p.name)).toEqual(["Amy", "Zed", "Bob", "Cat"])
    })
})
