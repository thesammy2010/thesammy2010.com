import type { Game, Match } from "./api"
import { gameWinner } from "./format"
import { busierFormat, formFor, partnerships, pointMargin, records, rivalries, totals } from "./stats"

function game(number: number, side1: number, side2: number, rallies = 0): Game {
    return { number, side1_points: side1, side2_points: side2, winning_side: gameWinner(side1, side2, 11), rallies }
}

let nextId = 0

function match(games: Game[], overrides: Partial<Match> = {}): Match {
    const won = (side: 1 | 2) => games.filter((g) => g.winning_side === side).length
    const side1_games = won(1)
    const side2_games = won(2)
    return {
        id: `m${++nextId}`,
        format: "singles",
        status: "completed",
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
        side1_games,
        side2_games,
        winning_side: side1_games > side2_games ? 1 : side2_games > side1_games ? 2 : null,
        serving_side: null,
        version: 1,
        created_by_id: "u",
        created_at: "",
        ...overrides
    }
}

const aWins = () => match([game(1, 11, 5), game(2, 11, 7), game(3, 11, 9)])
const bWins = () => match([game(1, 5, 11), game(2, 7, 11), game(3, 9, 11)])
const drawn = () => match([game(1, 11, 5), game(2, 5, 11)])

describe("totals", () => {
    it("adds up matches, games and points, and counts matches scored live", () => {
        const live = match([game(1, 11, 3, 14)])
        expect(totals([aWins(), live])).toEqual({ matches: 2, games: 4, points: 68, scoredLive: 1 })
    })
})

describe("formFor", () => {
    it("lists results most recent first and finds the current run", () => {
        const form = formFor([aWins(), aWins(), bWins(), aWins()], "a")
        expect(form.results.map((r) => r.result)).toEqual(["W", "W", "L", "W"])
        expect(form.current).toEqual({ result: "W", length: 2 })
        expect(form.longestWinStreak).toBe(2)
    })

    it("counts a match with no winner as a draw", () => {
        expect(formFor([drawn(), bWins()], "b").current).toEqual({ result: "D", length: 1 })
    })

    it("runs the whole way when every result is the same", () => {
        expect(formFor([bWins(), bWins()], "a").current).toEqual({ result: "L", length: 2 })
    })

    it("skips private matches hidden from the viewer, rather than counting a draw", () => {
        const hidden = match([], { is_private: true, hidden: true, winning_side: null })
        expect(formFor([hidden, match([game(1, 11, 5)])], "a").results.map((r) => r.result)).toEqual(["W"])
    })

    it("skips matches the player wasn't in", () => {
        const form = formFor([aWins()], "c")
        expect(form.results).toEqual([])
        expect(form.current).toBeNull()
        expect(form.longestWinStreak).toBe(0)
    })
})

describe("records", () => {
    it("finds the longest game, closest match and biggest win", () => {
        const tight = match([game(1, 14, 12), game(2, 9, 11), game(3, 11, 9)])
        const thrashing = match([game(1, 11, 0), game(2, 11, 1)])
        const result = records([aWins(), tight, thrashing, drawn()])
        expect(result.longestGame?.match).toBe(tight)
        expect(result.longestGame?.game.number).toBe(1)
        expect(result.closestMatch).toBe(tight)
        expect(result.biggestWin).toBe(thrashing)
        expect(pointMargin(thrashing)).toBe(21)
    })

    it("breaks a tie on margin with the match that went longer", () => {
        const short = match([game(1, 12, 10)])
        const long = match([game(1, 12, 10), game(2, 10, 12), game(3, 12, 10)])
        expect(records([short, long]).closestMatch).toBe(long)
    })

    it("has nothing to show before any match", () => {
        expect(records([])).toEqual({ longestGame: null, closestMatch: null, biggestWin: null })
    })
})

describe("rivalries", () => {
    it("pairs players whichever side they were on, most played first", () => {
        const swapped = (m: Match) => ({
            ...m,
            players: [
                { player_id: "b", side: 1 as const },
                { player_id: "a", side: 2 as const }
            ]
        })
        const other = match([game(1, 11, 2)], {
            players: [
                { player_id: "c", side: 1 },
                { player_id: "a", side: 2 }
            ]
        })
        const doubles = match([game(1, 11, 2)], {
            format: "doubles",
            players: [
                { player_id: "a", side: 1 },
                { player_id: "c", side: 1 },
                { player_id: "b", side: 2 },
                { player_id: "d", side: 2 }
            ]
        })
        expect(rivalries([aWins(), swapped(aWins()), drawn(), other, doubles])).toEqual([
            { playerIds: ["a", "b"], played: 3, wins: [1, 1], drawn: 1 },
            { playerIds: ["a", "c"], played: 1, wins: [0, 1], drawn: 0 }
        ])
    })
})

describe("partnerships", () => {
    it("counts pairs on the same side of a doubles match, most played first", () => {
        const doubles = (side1: string[], side2: string[], games: Game[]) =>
            match(games, {
                format: "doubles",
                players: [
                    ...side1.map((player_id) => ({ player_id, side: 1 as const })),
                    ...side2.map((player_id) => ({ player_id, side: 2 as const }))
                ]
            })
        const result = partnerships([
            doubles(["a", "b"], ["c", "d"], [game(1, 11, 5)]),
            doubles(["d", "c"], ["b", "a"], [game(1, 11, 5)]),
            doubles(["a", "c"], ["b", "d"], [game(1, 11, 5), game(2, 5, 11)]),
            aWins()
        ])
        expect(result.slice(0, 2)).toEqual([
            { playerIds: ["a", "b"], played: 2, won: 1, lost: 1, drawn: 0 },
            { playerIds: ["c", "d"], played: 2, won: 1, lost: 1, drawn: 0 }
        ])
        expect(result.find((p) => p.playerIds.join() === "a,c")).toEqual({
            playerIds: ["a", "c"],
            played: 1,
            won: 0,
            lost: 0,
            drawn: 1
        })
    })
})

describe("busierFormat", () => {
    it("picks the format with more matches, singles on a tie", () => {
        const doubles = () => match([], { format: "doubles" })
        expect(busierFormat([aWins(), doubles(), doubles()])).toBe("doubles")
        expect(busierFormat([aWins(), doubles()])).toBe("singles")
        expect(busierFormat([])).toBe("singles")
    })
})
