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

    it("gives up while the rallies are behind the match", () => {
        const { match, rallies } = play("11", 1)
        expect(serviceBox(match, rallies.slice(0, 1), null)).toBeNull()
    })
})
