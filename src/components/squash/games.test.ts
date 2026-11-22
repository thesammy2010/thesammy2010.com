import type { Game, Match } from "./api"
import { gamesOf, wentToDeuce } from "./games"

function game(number: number, side1: number, side2: number, rallies = 0): Game {
    return { number, side1_points: side1, side2_points: side2, winning_side: side1 > side2 ? 1 : 2, rallies }
}

function match(id: string, games: Game[], overrides: Partial<Match> = {}): Match {
    return {
        id,
        format: "singles",
        status: "completed",
        played_at: null,
        venue: null,
        venue_id: null,
        points_to: 11,
        best_of: null,
        notes: null,
        is_private: false,
        hidden: false,
        players: [],
        games,
        side1_games: null,
        side2_games: null,
        winning_side: null,
        serving_side: null,
        version: 1,
        created_by_id: "u",
        created_at: "",
        ...overrides
    }
}

describe("wentToDeuce", () => {
    it("is when both reach one short of the target", () => {
        expect(wentToDeuce(game(1, 12, 10), 11)).toBe(true)
        expect(wentToDeuce(game(1, 11, 9), 11)).toBe(false)
        expect(wentToDeuce(game(1, 14, 15), 15)).toBe(true)
    })
})

describe("gamesOf", () => {
    const newer = match("new", [game(1, 11, 4), game(2, 12, 10, 24)])
    const older = match("old", [game(1, 9, 11)])

    it("lists the newest match's latest game first", () => {
        expect(gamesOf([newer, older]).map((e) => `${e.match.id}-${e.game.number}`)).toEqual([
            "new-2",
            "new-1",
            "old-1"
        ])
    })

    it("leaves out cancelled matches and hidden ones' missing games", () => {
        const cancelled = match("c", [game(1, 11, 2)], { status: "cancelled" })
        const hidden = match("h", [], { is_private: true, hidden: true })
        expect(gamesOf([cancelled, hidden, older]).map((e) => e.match.id)).toEqual(["old"])
    })

    it("narrows to deuce games, or those scored live", () => {
        expect(gamesOf([newer, older], { deuceOnly: true }).map((e) => e.game.number)).toEqual([2])
        expect(gamesOf([newer, older], { liveOnly: true }).map((e) => e.game.number)).toEqual([2])
    })
})

describe("gamesOf by length", () => {
    const timed = (number: number, seconds: number | null) => ({
        ...game(number, 11, 5, 16),
        duration_seconds: seconds
    })
    const matches = [match("m1", [timed(1, 200), timed(2, 300), timed(3, 420), game(4, 11, 9)])]
    const seconds = (filters: Parameters<typeof gamesOf>[1]) =>
        gamesOf(matches, filters).map((e) => e.game.duration_seconds ?? null)

    it("narrows to the games timed at a length", () => {
        expect(seconds({ length: "short" })).toEqual([200])
        expect(seconds({ length: "medium" })).toEqual([300])
        expect(seconds({ length: "long" })).toEqual([420])
    })

    it("sorts by how long they took, untimed games last", () => {
        expect(seconds({ sort: "longest" })).toEqual([420, 300, 200, null])
        expect(seconds({ sort: "shortest" })).toEqual([200, 300, 420, null])
        expect(seconds({})).toEqual([null, 420, 300, 200])
    })
})
