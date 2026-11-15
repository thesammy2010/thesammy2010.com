import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { financeApi, loadReferences, MonthlyStats, References, YearlyStats, useFinanceLoad } from "../components/finance/api"
import FinancePage, { StatTile, Stepper } from "../components/finance/FinancePage"
import TransactionForm from "../components/finance/TransactionForm"
import BarChart from "../components/go_heavier/BarChart"
import {
    formatDayShort,
    formatGBP,
    formatGBPShort,
    formatGBPWhole,
    formatMonth,
    monthRange,
    monthShort,
    shiftMonth,
    spends
} from "../components/finance/format"

interface OverviewData {
    monthly: MonthlyStats
    yearly: YearlyStats
    references: References
}

// A month only touches a handful of the categories that have a target, so
// the untouched ones are folded away rather than listed as a wall of £0s.
function MonthCategories({ monthly }: { monthly: MonthlyStats }) {
    const [showUntouched, setShowUntouched] = useState(false)
    const { after, before } = monthRange(monthly.year, monthly.month)
    const widest = Math.max(...monthly.categories.map((c) => Math.max(c.spent_gbp, c.target_gbp ?? 0)), 1)
    const touched = monthly.categories.filter((c) => c.transactions > 0)
    const untouched = monthly.categories.filter((c) => c.transactions === 0)
    const shown = showUntouched ? [...touched, ...untouched] : touched

    return (
        <div className="finance-card">
            <h4 className="top-list-title">By category</h4>
            {monthly.categories.length === 0 ? (
                <p className="finance-muted">Nothing spent or budgeted this month.</p>
            ) : (
                <ol className="top-list">
                    {shown.map((category) => {
                        const over = category.target_gbp !== null && category.spent_gbp > category.target_gbp
                        return (
                            <li key={category.category_id} className="top-list-item">
                                <div className="top-list-head">
                                    <Link
                                        className="top-list-name finance-link"
                                        to={`/finance/transactions?category_id=${category.category_id}&after=${after}&before=${before}`}
                                    >
                                        {category.name}
                                    </Link>
                                    <span className={`top-list-metric ${over ? "finance-over" : ""}`}>
                                        {formatGBPWhole(category.spent_gbp)}
                                        {category.target_gbp !== null && ` / ${formatGBPWhole(category.target_gbp)}`}
                                    </span>
                                </div>
                                <div className="top-list-bar-track finance-target-track">
                                    <div
                                        className={`top-list-bar ${over ? "finance-bar-over" : ""}`}
                                        style={{ width: `${(Math.max(category.spent_gbp, 0) / widest) * 100}%` }}
                                    />
                                    {category.target_gbp !== null && (
                                        <div
                                            className="finance-target-marker"
                                            style={{ left: `${(category.target_gbp / widest) * 100}%` }}
                                            title={`Target ${formatGBP(category.target_gbp)}`}
                                        />
                                    )}
                                </div>
                                <div className="top-list-meta">
                                    {category.group} · {spends(category.transactions)}
                                </div>
                            </li>
                        )
                    })}
                </ol>
            )}
            {untouched.length > 0 && (
                <button
                    type="button"
                    className="finance-text-button finance-list-toggle"
                    onClick={() => setShowUntouched(!showUntouched)}
                >
                    {showUntouched
                        ? "Hide categories with nothing spent"
                        : `Show ${untouched.length} more with nothing spent`}
                </button>
            )}
        </div>
    )
}

// Enough of the recurring spends still to come to see what's next; the rest
// are a click away.
const PENDING_SHOWN = 5

function Forecast({ monthly }: { monthly: MonthlyStats }) {
    const forecast = monthly.forecast
    const [showAllPending, setShowAllPending] = useState(false)
    if (!forecast) {
        return null
    }
    const scale = Math.max(forecast.projected_total_gbp, monthly.target_gbp, 1)
    const projectedOver = monthly.target_gbp > 0 && forecast.projected_total_gbp > monthly.target_gbp

    return (
        <div className="finance-card">
            <h4 className="top-list-title">Where the month is heading</h4>
            <p className="finance-forecast-headline">
                <span className={projectedOver ? "finance-over" : "finance-under"}>
                    {formatGBPWhole(forecast.projected_total_gbp)}
                </span>{" "}
                projected
                {monthly.target_gbp > 0 && <> against a {formatGBPWhole(monthly.target_gbp)} target</>}
            </p>
            <div className="finance-forecast-track">
                <div
                    className="finance-forecast-spent"
                    style={{ width: `${(monthly.total_gbp / scale) * 100}%` }}
                    title={`Spent ${formatGBP(monthly.total_gbp)}`}
                />
                <div
                    className="finance-forecast-projected"
                    style={{ width: `${(Math.max(forecast.projected_total_gbp - monthly.total_gbp, 0) / scale) * 100}%` }}
                    title={`Still to come ${formatGBP(forecast.projected_total_gbp - monthly.total_gbp)}`}
                />
                {monthly.target_gbp > 0 && (
                    <div className="finance-target-marker" style={{ left: `${(monthly.target_gbp / scale) * 100}%` }} />
                )}
            </div>
            <p className="top-list-meta">
                Day {forecast.days_elapsed} of {forecast.days_in_month} · {formatGBP(forecast.average_per_day_gbp)} a day
                so far · {formatGBP(forecast.discretionary_per_day_gbp)} a day outside recurring
            </p>

            {forecast.pending_recurring.length > 0 && (
                <>
                    <h5 className="finance-subheading">
                        Recurring still to come · {formatGBP(forecast.pending_recurring_gbp)}
                    </h5>
                    <ul className="finance-simple-list">
                        {(showAllPending
                            ? forecast.pending_recurring
                            : forecast.pending_recurring.slice(0, PENDING_SHOWN)
                        ).map((pending, index) => (
                            <li key={`${pending.merchant_id ?? pending.description}-${index}`}>
                                <span>
                                    {pending.merchant ?? pending.description ?? "Unnamed"}
                                    <span className="finance-muted"> · {formatDayShort(pending.expected_on)}</span>
                                </span>
                                <span>{formatGBP(pending.amount_gbp)}</span>
                            </li>
                        ))}
                    </ul>
                    {forecast.pending_recurring.length > PENDING_SHOWN && (
                        <button
                            type="button"
                            className="finance-text-button finance-list-toggle"
                            onClick={() => setShowAllPending(!showAllPending)}
                        >
                            {showAllPending
                                ? "Show fewer"
                                : `Show all ${forecast.pending_recurring.length}`}
                        </button>
                    )}
                </>
            )}
        </div>
    )
}

export default function Finance() {
    const navigate = useNavigate()
    const now = new Date()
    const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
    const [showForm, setShowForm] = useState(false)

    const { state, refreshing, reload } = useFinanceLoad<OverviewData>(async () => {
        const [monthly, yearly, references] = await Promise.all([
            financeApi.monthly(period.year, period.month),
            financeApi.yearly(period.year),
            loadReferences()
        ])
        return { monthly, yearly, references }
    }, [period.year, period.month])

    const isCurrentMonth = period.year === now.getFullYear() && period.month === now.getMonth() + 1

    return (
        <FinancePage state={state} refreshing={refreshing} onRefresh={reload} what="Finances">
            {({ monthly, yearly, references }) => {
                const remaining = monthly.target_gbp - monthly.total_gbp
                const { after, before } = monthRange(monthly.year, monthly.month)
                return (
                    <>
                        <div className="finance-header">
                            <Stepper
                                label={formatMonth(period.year, period.month)}
                                onPrev={() => setPeriod(shiftMonth(period.year, period.month, -1))}
                                onNext={() => setPeriod(shiftMonth(period.year, period.month, 1))}
                                nextDisabled={isCurrentMonth}
                            />
                            <button className="finance-primary-button" onClick={() => setShowForm(true)}>
                                ➕ Add a spend
                            </button>
                        </div>

                        <div className="stats-grid">
                            <StatTile value={formatGBPWhole(monthly.total_gbp)} label="Spent" />
                            <StatTile value={formatGBPWhole(monthly.target_gbp)} label="Target" />
                            <StatTile
                                value={formatGBPWhole(Math.abs(remaining))}
                                label={remaining >= 0 ? "Left to spend" : "Over target"}
                                tone={remaining >= 0 ? "under" : "over"}
                            />
                            <StatTile value={String(monthly.transactions)} label="Spends" />
                            <StatTile value={formatGBPWhole(monthly.necessary_gbp)} label="Necessary" />
                            <StatTile value={formatGBPWhole(monthly.discretionary_gbp)} label="Discretionary" />
                            <StatTile value={formatGBPWhole(monthly.recurring_gbp)} label="Recurring" />
                            <StatTile value={formatGBPWhole(monthly.with_partner_gbp)} label="With partner" />
                        </div>

                        <div className="finance-columns">
                            <div className="finance-stack">
                                <Forecast monthly={monthly} />
                                <BarChart
                                    title={`Spent per month in ${yearly.year}`}
                                    subtitle={`${formatGBPWhole(yearly.total_gbp)} so far, ${formatGBPWhole(
                                        yearly.average_per_month_gbp
                                    )} a month on average`}
                                    data={yearly.months
                                        .slice(0, Math.max(yearly.months_elapsed, 1))
                                        .map((m) => ({ label: monthShort(m.month), value: m.total_gbp }))}
                                    formatValue={formatGBPShort}
                                />
                                {monthly.uncategorised_gbp > 0 && (
                                    <div className="finance-card finance-notice">
                                        {formatGBP(monthly.uncategorised_gbp)} this month has no category.{" "}
                                        <Link className="finance-link" to={`/finance/transactions?after=${after}&before=${before}`}>
                                            Review this month's spends
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <MonthCategories monthly={monthly} />
                        </div>

                        {showForm && (
                            <TransactionForm
                                references={references}
                                onClose={() => setShowForm(false)}
                                onSaved={(saved) => {
                                    setShowForm(false)
                                    navigate(`/finance/transactions/${saved.id}`)
                                }}
                            />
                        )}
                    </>
                )
            }}
        </FinancePage>
    )
}
