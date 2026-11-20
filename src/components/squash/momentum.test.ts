import type { Rally } from "./api"
import { momentum, nearestPoint } from "./momentum"

// "1" and "2" are points to that side, "L" a let and "S" a stroke to side 1
function rallies(game: number, winners: string): Rally[] {
    let side1 = 0
    let side2 = 0
    return winners.split("").map((w, i) => {
        const won_by_side = w === "L" ? null : w === "2" ? 2 : 1
        if (won_by_side === 1) {
            side1++
        } else if (won_by_side === 2) {
            side2++
        }
        return {
            game,
            number: i + 1,
            won_by_side,
            decision: w === "L" ? "let" : w === "S" ? "stroke" : null,
            appealed_by_side: w === "L" || w === "S" ? 1 : null,
            server_id: null,
            side1_points: side1,
            side2_points: side2
        }
    })
}

describe("momentum", () => {
    it("tracks side 1's lead, each game starting level after a gap", () => {
        const data = momentum([...rallies(1, "1121"), ...rallies(2, "22")])
        expect(data.games.map((g) => g.points.map((p) => p.lead))).toEqual([
            [0, 1, 2, 1, 2],
            [0, -1, -2]
        ])
        expect(data.games.map((g) => g.points.map((p) => p.x))).toEqual([
            [0, 1, 2, 3, 4],
            [5, 6, 7]
        ])
        expect(data.width).toBe(7)
        expect(data.games[0].points[4]).toMatchObject({
            side1: 3,
            side2: 1,
            rally: { number: 4, wonBy: 1, decision: null }
        })
    })

    it("scales to the biggest lead, but never under 3", () => {
        expect(momentum(rallies(1, "12")).maxLead).toBe(3)
        expect(momentum(rallies(1, "22222")).maxLead).toBe(5)
    })

    it("puts rallies in order whatever order they arrive in", () => {
        const data = momentum(rallies(1, "12").reverse())
        expect(data.games[0].points.map((p) => p.lead)).toEqual([0, 1, 0])
    })

    it("leaves out lets, which move no score, and keeps the call on a stroke", () => {
        const data = momentum(rallies(1, "1LS2"))
        expect(data.games[0].points.map((p) => [p.x, p.lead])).toEqual([
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 1]
        ])
        expect(data.games[0].points[2].rally).toEqual({ number: 3, wonBy: 1, decision: "stroke" })
    })

    it("is empty without rallies", () => {
        expect(momentum([])).toEqual({ games: [], width: 1, maxLead: 3 })
    })
})

describe("nearestPoint", () => {
    it("snaps to the closest rally, never a game's 0-0 start", () => {
        const data = momentum([...rallies(1, "11"), ...rallies(2, "2")])
        expect(nearestPoint(data, 0)?.point.x).toBe(1)
        expect(nearestPoint(data, 2.9)?.point.x).toBe(2)
        expect(nearestPoint(data, 4)).toMatchObject({ game: 2, point: { x: 4 } })
    })
})
