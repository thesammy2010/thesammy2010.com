import { Transaction } from "../../components/finance/api"
import { groupByDay } from "./Transactions"

function spend(id: string, spent_on: string, amount_gbp: number): Transaction {
    return {
        id,
        spent_on,
        amount_gbp,
        original_amount: null,
        original_currency: null,
        payment_method_id: "pm",
        merchant_id: null,
        category_id: null,
        description: null,
        is_necessary: null,
        is_recurring: null,
        with_partner: null,
        time_of_day: null,
        related_to_id: null,
        relation: null,
        created_at: "",
        updated_at: ""
    }
}

describe("groupByDay", () => {
    it("groups consecutive spends on the same day and totals them", () => {
        const days = groupByDay([
            spend("a", "2026-11-15", 10),
            spend("b", "2026-11-15", -2.5),
            spend("c", "2026-11-14", 4)
        ])

        expect(days.map((d) => [d.day, d.total, d.items.length])).toEqual([
            ["2026-11-15", 7.5, 2],
            ["2026-11-14", 4, 1]
        ])
    })

    it("returns nothing for no spends", () => {
        expect(groupByDay([])).toEqual([])
    })
})
