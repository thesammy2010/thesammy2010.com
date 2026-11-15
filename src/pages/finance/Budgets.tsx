import React, { useState } from "react"

import { Budget, Category, financeApi, loadReferences, useFinanceLoad, YearlyStats } from "../../components/finance/api"
import FinancePage, { StatTile, Stepper } from "../../components/finance/FinancePage"
import { formatGBP, formatGBPWhole } from "../../components/finance/format"

interface BudgetsData {
    categories: Category[]
    budgets: Budget[]
    previous: Budget[]
    yearly: YearlyStats
}

interface RowProps {
    year: number
    category: Category
    budget: Budget | undefined
    previous: Budget | undefined
    averageSpent: number | undefined
    onSaved: (budget: Budget) => void
}

function BudgetRow({ year, category, budget, previous, averageSpent, onSaved }: RowProps) {
    const [target, setTarget] = useState(budget ? String(budget.monthly_target_gbp) : "")
    const [rationale, setRationale] = useState(budget?.rationale ?? "")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const dirty =
        target !== (budget ? String(budget.monthly_target_gbp) : "") || rationale !== (budget?.rationale ?? "")
    const targetValue = target === "" ? null : Number(target)
    const over = targetValue !== null && averageSpent !== undefined && averageSpent > targetValue

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        if (targetValue === null) {
            return
        }
        setSaving(true)
        setError(null)
        try {
            onSaved(
                await financeApi.putBudget(year, category.id, {
                    monthly_target_gbp: targetValue,
                    rationale: rationale.trim() || null
                })
            )
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <tr>
            <th scope="row">
                {category.name}
                {error && <div className="error-message finance-inline-error">{error}</div>}
            </th>
            <td>
                <form id={`budget-${category.id}`} onSubmit={save} />
                <input
                    form={`budget-${category.id}`}
                    className="finance-input finance-input-money"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={previous ? String(previous.monthly_target_gbp) : "None"}
                    aria-label={`Monthly target for ${category.name}`}
                />
            </td>
            <td>
                <input
                    form={`budget-${category.id}`}
                    className="finance-input"
                    type="text"
                    maxLength={255}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder={previous?.rationale ?? "e.g. 5x/month @ £30"}
                    aria-label={`Rationale for ${category.name}`}
                />
            </td>
            <td className={over ? "finance-over" : ""}>{formatGBPWhole(averageSpent)}</td>
            <td>{targetValue !== null ? formatGBPWhole(targetValue * 12) : "—"}</td>
            <td>
                <button
                    form={`budget-${category.id}`}
                    type="submit"
                    className="finance-secondary-button"
                    disabled={!dirty || saving || targetValue === null}
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            </td>
        </tr>
    )
}

export default function Budgets() {
    const [year, setYear] = useState(new Date().getFullYear())
    // Saved rows, layered over what was loaded so a save doesn't reload the
    // whole table and wipe edits in progress on other rows.
    const [saved, setSaved] = useState<Record<string, Budget>>({})

    const { state, refreshing, reload } = useFinanceLoad<BudgetsData>(async () => {
        const [references, budgets, previous, yearly] = await Promise.all([
            loadReferences(),
            financeApi.budgets(year),
            financeApi.budgets(year - 1),
            financeApi.yearly(year)
        ])
        setSaved({})
        return { categories: references.categories, budgets, previous, yearly }
    }, [year])

    return (
        <FinancePage state={state} refreshing={refreshing} onRefresh={reload} what="Budgets">
            {({ categories, budgets, previous, yearly }) => {
                const byCategory = new Map(budgets.map((b) => [b.category_id, b]))
                Object.values(saved).forEach((b) => byCategory.set(b.category_id, b))
                const previousByCategory = new Map(previous.map((b) => [b.category_id, b]))
                const averages = new Map(yearly.categories.map((c) => [c.category_id, c.average_gbp]))
                const monthlyTotal = Array.from(byCategory.values()).reduce((sum, b) => sum + b.monthly_target_gbp, 0)

                const groups = new Map<string, Category[]>()
                categories.forEach((category) => {
                    groups.set(category.group, [...(groups.get(category.group) ?? []), category])
                })

                return (
                    <>
                        <div className="finance-header">
                            <Stepper label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} />
                        </div>

                        <div className="stats-grid">
                            <StatTile value={formatGBPWhole(monthlyTotal)} label="Monthly target" />
                            <StatTile value={formatGBPWhole(monthlyTotal * 12)} label="Yearly target" />
                            <StatTile value={formatGBPWhole(yearly.average_per_month_gbp)} label="Spent per month" />
                            <StatTile value={String(byCategory.size)} label="Categories budgeted" />
                        </div>

                        <div className="finance-card">
                            <p className="finance-muted">
                                Each category's monthly target for {year}. Placeholders show {year - 1}'s. Average spent
                                counts the months of {year} so far.
                            </p>
                            <div className="finance-table-wrapper">
                                <table className="finance-table finance-budget-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Per month (£)</th>
                                            <th>Rationale</th>
                                            <th>Average spent</th>
                                            <th>Per year</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    {Array.from(groups.entries()).map(([group, items]) => {
                                        const groupTotal = items.reduce(
                                            (sum, c) => sum + (byCategory.get(c.id)?.monthly_target_gbp ?? 0),
                                            0
                                        )
                                        return (
                                            <tbody key={group}>
                                                <tr className="finance-group-row">
                                                    <th colSpan={6}>
                                                        {group} <span className="finance-muted">· {formatGBP(groupTotal)} a month</span>
                                                    </th>
                                                </tr>
                                                {items.map((category) => (
                                                    <BudgetRow
                                                        // Keyed by year too, so stepping years resets each row's inputs.
                                                        key={`${year}-${category.id}`}
                                                        year={year}
                                                        category={category}
                                                        budget={byCategory.get(category.id)}
                                                        previous={previousByCategory.get(category.id)}
                                                        averageSpent={averages.get(category.id)}
                                                        onSaved={(budget) =>
                                                            setSaved((prev) => ({ ...prev, [budget.category_id]: budget }))
                                                        }
                                                    />
                                                ))}
                                            </tbody>
                                        )
                                    })}
                                </table>
                            </div>
                        </div>
                    </>
                )
            }}
        </FinancePage>
    )
}
