import type { Match, Rally, Side } from "./api"
import { gameWinner } from "./format"
import { serviceBox } from "./serve"

// One game's rallies from a string: "1" and "2" are points to that side,
// "L" a let. The first rally is served by `server`'s player when given.
function play(winners: string, server: Side | null = null): { match: Match; rallies: Rally[] } {
    let side1 = 0
    let side2 = 0
    const rallies: Rally[] = winners.split("").map((w, i) => {
        const won_by_side = w === "L" ? null : w === "1" ? 1 : 2
        if (won_by_side === 1) {
            side1++
        } else if (won_by_side === 2) {
            side2++
        }
        return {
            game: 1,
            number: i + 1,
            won_by_side,
            decision: w === "L" ? "let" : null,
            appealed_by_side: w === "L" ? 1 : null,
            server_id: i === 0 && server ? (server === 1 ? "a" : "b") : null,
            side1_points: side1,
            side2_points: side2
        }
    })
    const lastWon = [...rallies].reverse().find((r) => r.won_by_side !== null)
    const match: Match = {
        id: "m",
        format: "singles",
        status: "in_progress",
        played_at: null,
        venue: null,
        venue_id: null,
        points_to: 11,
        best_of: null,
        notes: null,
        is_private: false,
        hidden: false,
        players: [
            { player_id: "a", side: 1 },
            { player_id: "b", side: 2 }
        ],
        games: rallies.length
            ? [
                  {
                      number: 1,
                      side1_points: side1,
                      side2_points: side2,
                      winning_side: gameWinner(side1, side2, 11),
                      rallies: rallies.length
                  }
              ]
            : [],
        side1_games: 0,
        side2_games: 0,
        winning_side: null,
        // As the API works it out: whoever won the last point serves, or
        // with only lets so far, whoever served them
        serving_side: lastWon ? (lastWon.won_by_side as Side) : rallies.length ? server : null,
        version: 1,
        created_by_id: "u",
        created_at: ""
    }
    return { match, rallies }
}

const box = (winners: string, server: Side | null, firstServer: Side | null = null) => {
    const { match, rallies } = play(winners, server)
    return serviceBox(match, rallies, firstServer)?.box ?? null
}

// Several games, each as `play` takes one, with whoever's named serving each
// game's first rally, and the side the API says serves next.
function playGames(
    games: { winners: string; server?: Side | null }[],
    serving: Side,
    firstServing: Side | null = null
): { match: Match; rallies: Rally[] } {
    const played = games.map(({ winners, server }, i) => {
        const { match, rallies } = play(winners, server ?? null)
        return {
            games: match.games.map((g) => ({ ...g, number: i + 1 })),
            rallies: rallies.map((r) => ({ ...r, game: i + 1 }))
        }
    })
    const { match } = play("")
    return {
        match: {
            ...match,
            games: played.flatMap((p) => p.games),
            serving_side: serving,
            first_serving_side: firstServing
        },
        rallies: played.flatMap((p) => p.rallies)
    }
}

const ELEVEN = "11111111111"

describe("serviceBox", () => {
    it("starts on the right and moves across after each point the server wins", () => {
        expect(box("", null, 1)).toBe("right")
        expect(box("1", 1)).toBe("left")
        expect(box("11", 1)).toBe("right")
        expect(box("111", 1)).toBe("left")
    })

    it("starts a new hand on the right when the serve is won back", () => {
        expect(box("112", 1)).toBe("right")
        expect(box("1122", 1)).toBe("left")
        // Side 2 served first and lost it, so side 1's hand began after that
        expect(box("1", 2)).toBe("right")
        expect(box("11", 2)).toBe("left")
    })

    it("serves a let again from the same box", () => {
        expect(box("1L", 1)).toBe("left")
        expect(box("L", 1)).toBe("right")
    })

    it("can't tell without knowing who served first", () => {
        expect(box("", null)).toBeNull()
        expect(box("11", null)).toBeNull()
        // Once the serve has changed hands it can
        expect(box("112", null)).toBe("right")
    })

    it("keeps a switched box for that hand only", () => {
        const { match, rallies } = play("11", 1)
        const hand = serviceBox(match, rallies, null)!.hand
        expect(serviceBox(match, rallies, null, new Set([hand]))?.box).toBe("left")
        const next = play("112", 1)
        expect(serviceBox(next.match, next.rallies, null, new Set([hand]))?.box).toBe("right")
    })

    it("starts each hand in the box the server prefers", () => {
        const left = (side: Side) => (side === 1 ? "left" : "right")
        const { match, rallies } = play("1", 1)
        expect(serviceBox(match, rallies, null, new Set(), left)?.box).toBe("right")
        const start = play("", null)
        expect(serviceBox(start.match, start.rallies, 1, new Set(), left)?.box).toBe("left")
        // Side 2 prefers the right, and side 1 begins a new hand on the left
        const back = play("12", 1)
        expect(serviceBox(back.match, back.rallies, null, new Set(), left)?.box).toBe("right")
        const again = play("121", 1)
        expect(serviceBox(again.match, again.rallies, null, new Set(), left)?.box).toBe("left")
    })

    it("switches a preferred box to the other one for that hand", () => {
        const { match, rallies } = play("", null)
        const hand = serviceBox(match, rallies, 1, new Set(), () => "left")!.hand
        expect(serviceBox(match, rallies, 1, new Set([hand]), () => "left")?.box).toBe("right")
    })

    it("serves first from the side picked over the API's spin", () => {
        const { match, rallies } = play("", null)
        const spun = { ...match, serving_side: 2 as Side }
        const sides = (side: Side) => (side === 1 ? "left" : "right")
        expect(serviceBox(spun, rallies, null, new Set(), sides)?.box).toBe("right")
        expect(serviceBox(spun, rallies, 1, new Set(), sides)?.box).toBe("left")
    })

    it("starts the next game's first hand in the server's box when the sides take turns", () => {
        // Side 1 served first and won game 1, so side 2 serves first in game 2
        const { match, rallies } = playGames([{ winners: ELEVEN, server: 1 }], 2)
        expect(serviceBox(match, rallies, null)?.box).toBe("right")
    })

    it("follows the sides taking turns when a game's first server wasn't named", () => {
        // Side 2 serves first in game 2, and has won its first two points
        const { match, rallies } = playGames([{ winners: ELEVEN, server: 1 }, { winners: "22" }], 2)
        expect(serviceBox(match, rallies, null)?.box).toBe("right")
        // Game 1's first server from the spin of the racket alone
        const spun = playGames([{ winners: ELEVEN }, { winners: "222" }], 2, 1)
        expect(serviceBox(spun.match, spun.rallies, null)?.box).toBe("left")
    })

    it("goes by who was named serving first in a game over taking turns", () => {
        // Side 1 served game 2 first too, as they chose, and won two points
        const { match, rallies } = playGames(
            [
                { winners: ELEVEN, server: 1 },
                { winners: "11", server: 1 }
            ],
            1
        )
        expect(serviceBox(match, rallies, null)?.box).toBe("right")
    })

    it("gives up while the rallies are behind the match", () => {
        const { match, rallies } = play("11", 1)
        expect(serviceBox(match, rallies.slice(0, 1), null)).toBeNull()
    })
})
