import type { Game, Match, Player } from "./api"
import {
    ballFor,
    canMerge,
    currentGame,
    gameScores,
    gameWinner,
    nextEnteredGame,
    record,
    resultSummary,
    sideNames,
    signed,
    winRate
} from "./format"

function game(number: number, side1: number, side2: number, rallies = side1 + side2): Game {
    return { number, side1_points: side1, side2_points: side2, winning_side: gameWinner(side1, side2, 11), rallies }
}

function match(games: Game[], overrides: Partial<Match> = {}): Match {
    const won = (side: 1 | 2) => games.filter((g) => g.winning_side === side).length
    return {
        id: "m",
        format: "singles",
        status: "in_progress",
        played_at: null,
        venue: null,
        venue_id: null,
        points_to: 11,
        best_of: 5,
        notes: null,
        is_private: false,
        hidden: false,
        players: [
            { player_id: "a", side: 1 },
            { player_id: "b", side: 2 }
        ],
        games,
        side1_games: won(1),
        side2_games: won(2),
        winning_side: null,
        serving_side: null,
        version: 1,
        created_by_id: "u",
        created_at: "",
        ...overrides
    }
}

describe("gameWinner", () => {
    it("ends a game at the target when two clear", () => {
        expect(gameWinner(11, 9, 11)).toBe(1)
        expect(gameWinner(4, 11, 11)).toBe(2)
    })

    it("plays on from one short all until two clear", () => {
        expect(gameWinner(11, 10, 11)).toBeNull()
        expect(gameWinner(12, 10, 11)).toBe(1)
        expect(gameWinner(13, 15, 11)).toBe(2)
    })
})

describe("currentGame", () => {
    it("is the last game while it's unfinished", () => {
        expect(currentGame(match([game(1, 11, 3), game(2, 4, 6)])).number).toBe(2)
    })

    it("is a fresh game after a finished one", () => {
        const next = currentGame(match([game(1, 11, 3)]))
        expect([next.number, next.side1_points, next.side2_points]).toEqual([2, 0, 0])
    })

    it("is game one before anything is scored", () => {
        expect(currentGame(match([])).number).toBe(1)
    })
})

describe("nextEnteredGame", () => {
    it("corrects an unfinished game that was typed in", () => {
        expect(nextEnteredGame(match([game(1, 11, 3), game(2, 5, 4, 0)]))).toBe(2)
    })

    it("moves past an unfinished game being scored live", () => {
        expect(nextEnteredGame(match([game(1, 5, 4)]))).toBe(2)
    })
})

describe("ballFor", () => {
    it("calls game ball", () => {
        expect(ballFor(match([game(1, 10, 6)]))).toEqual({ side: 1, kind: "game" })
    })

    it("calls match ball for the side a game from winning", () => {
        expect(ballFor(match([game(1, 11, 2), game(2, 11, 5), game(3, 3, 10)], { best_of: 3 }))).toEqual({
            side: 2,
            kind: "game"
        })
        expect(ballFor(match([game(1, 11, 2), game(2, 9, 11), game(3, 10, 3)], { best_of: 3 }))).toEqual({
            side: 1,
            kind: "match"
        })
    })

    it("is game ball at deuce only for the side ahead", () => {
        expect(ballFor(match([game(1, 10, 10)]))).toBeNull()
        expect(ballFor(match([game(1, 10, 11)]))).toEqual({ side: 2, kind: "game" })
    })

    it("never calls match ball in an open-ended match", () => {
        expect(ballFor(match([game(1, 11, 2), game(2, 10, 3)], { best_of: null }))).toEqual({ side: 1, kind: "game" })
    })
})

describe("labels", () => {
    const players = [
        { id: "a", name: "Leo" },
        { id: "b", name: "Alex" },
        { id: "c", name: "Sam" }
    ] as Player[]

    it("names a side", () => {
        const doubles = match([], {
            players: [
                { player_id: "a", side: 1 },
                { player_id: "c", side: 1 },
                { player_id: "b", side: 2 },
                { player_id: "gone", side: 2 }
            ]
        })
        expect(sideNames(doubles, 1, players)).toBe("Leo & Sam")
        expect(sideNames(doubles, 2, players)).toBe("Alex & Unknown player")
    })

    it("lists game scores", () => {
        expect(gameScores(match([game(1, 11, 7), game(2, 9, 11)]))).toBe("11-7, 9-11")
    })

    it("shows a record, with draws only when there are some", () => {
        expect(record(4, 2, 0)).toBe("4-2")
        expect(record(4, 2, 1)).toBe("4-2-1")
        expect(winRate(0.666)).toBe("67%")
        expect(winRate(null)).toBe("—")
    })
})

describe("canMerge", () => {
    const other = (overrides: Partial<Match> = {}) => match([game(1, 11, 4)], { id: "n", ...overrides })

    it("takes the same players on the same or swapped sides", () => {
        expect(canMerge(match([]), other())).toBe(true)
        expect(
            canMerge(
                match([]),
                other({
                    players: [
                        { player_id: "b", side: 1 },
                        { player_id: "a", side: 2 }
                    ]
                })
            )
        ).toBe(true)
    })

    it("refuses itself, other players, other formats, points and cancelled matches", () => {
        expect(canMerge(match([]), match([]))).toBe(false)
        expect(
            canMerge(
                match([]),
                other({
                    players: [
                        { player_id: "a", side: 1 },
                        { player_id: "c", side: 2 }
                    ]
                })
            )
        ).toBe(false)
        expect(canMerge(match([]), other({ points_to: 15 }))).toBe(false)
        expect(canMerge(match([]), other({ status: "cancelled" }))).toBe(false)
    })

    it("refuses doubles pairs split up differently", () => {
        const doubles = (pairs: string[][]) => ({
            format: "doubles" as const,
            players: pairs.flatMap((ids, i) => ids.map((player_id) => ({ player_id, side: (i + 1) as 1 | 2 })))
        })
        const base = match(
            [],
            doubles([
                ["a", "b"],
                ["c", "d"]
            ])
        )
        expect(
            canMerge(
                base,
                other(
                    doubles([
                        ["c", "d"],
                        ["a", "b"]
                    ])
                )
            )
        ).toBe(true)
        expect(
            canMerge(
                base,
                other(
                    doubles([
                        ["a", "c"],
                        ["b", "d"]
                    ])
                )
            )
        ).toBe(false)
    })
})

describe("signed", () => {
    it("marks a rise and a fall, and leaves no change bare", () => {
        expect(signed(12)).toBe("+12")
        expect(signed(-8)).toBe("\u22128")
        expect(signed(0)).toBe("0")
    })
})

describe("resultSummary", () => {
    const players = [
        { id: "a", name: "Leo" },
        { id: "b", name: "Alex" }
    ] as Player[]

    it("tells it from the winner's side", () => {
        const won = match([game(1, 7, 11), game(2, 11, 9), game(3, 4, 11), game(4, 8, 11)], {
            status: "completed",
            winning_side: 2
        })
        expect(resultSummary(won, players)).toBe("Alex beat Leo 3-1 (11-7, 9-11, 11-4, 11-8)")
    })

    it("tells a draw, leaving out an unfinished game", () => {
        const drawn = match([game(1, 11, 5), game(2, 6, 11), game(3, 3, 2)], {
            status: "completed",
            winning_side: null
        })
        expect(resultSummary(drawn, players)).toBe("Leo drew with Alex 1-1 (11-5, 6-11)")
    })
})
