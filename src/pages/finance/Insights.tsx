import React, { useState } from "react"
import { Link } from "react-router-dom"

import {
    Breakdown,
    financeApi,
    MerchantStats,
    PeriodComparison,
    UnusualSpend,
    useFinanceLoad,
    YearlyStats,
    YearOnYear
} from "../../components/finance/api"
import FinancePage, { RankedList, StatTile, Stepper } from "../../components/finance/FinancePage"
import BarChart from "../../components/go_heavier/BarChart"
import {
    formatChangePct,
    formatDay,
    formatDayShort,
    formatGBP,
    formatGBPShort,
    formatGBPWhole,
    formatShare,
    labelFor,
    monthShort,
    spends,
    TIMES_OF_DAY,
    weekdayShort
} from "../../components/finance/format"

interface InsightsData {
    yearly: YearlyStats
    yearOnYear: YearOnYear | null
    merchants: MerchantStats
    breakdown: Breakdown
    unusual: UnusualSpend[]
}

const FIRST_YEAR = 2024

function Comparison({ title, period }: { title: string; period: PeriodComparison }) {
    const movers = period.categories.slice(0, 6)
    return (
        <div className="finance-card">
            <h4 className="top-list-title">{title}</h4>
            <p className="finance-forecast-headline">
                {formatGBPWhole(period.total_gbp)}{" "}
                <span className={period.change_gbp > 0 ? "finance-over" : "finance-under"}>
                    {formatChangePct(period.change_pct)}
                </span>
            </p>
            <p className="top-list-meta">
                {formatDayShort(period.start)} – {formatDayShort(period.end)} against{" "}
                {formatGBPWhole(period.previous_total_gbp)} a year before
            </p>
            {movers.length > 0 && (
                <>
                    <h5 className="finance-subheading">Biggest changes</h5>
                    <ul className="finance-simple-list">
                        {movers.map((category) => (
                            <li key={category.category_id}>
                                <span>{category.name}</span>
                                <span className={category.change_gbp > 0 ? "finance-over" : "finance-under"}>
                                    {category.change_gbp > 0 ? "+" : "−"}
                                    {formatGBPWhole(Math.abs(category.change_gbp))}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    )
}

function GroupTable({ yearly }: { yearly: YearlyStats }) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const elapsed = yearly.months_elapsed
    return (
        <div className="finance-card">
            <h4 className="top-list-title">Month by month</h4>
            <div className="finance-table-wrapper">
                <table className="finance-table">
                    <thead>
                        <tr>
                            <th>Group</th>
                            {months.map((month) => (
                                <th key={month}>{monthShort(month)}</th>
                            ))}
                            <th>Total</th>
                            <th>Target to date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {yearly.groups.map((group) => {
                            const targetToDate = group.target_gbp * elapsed
                            return (
                                <tr key={group.group}>
                                    <th scope="row">{group.group}</th>
                                    {months.map((month) => {
                                        const spent = group.months[month - 1] ?? 0
                                        // Shade a month that went over its target.
                                        const over = group.target_gbp > 0 && spent > group.target_gbp
                                        return (
                                            <td key={month} className={over ? "finance-cell-over" : ""}>
                                                {month <= elapsed ? formatGBPWhole(spent) : ""}
                                            </td>
                                        )
                                    })}
                                    <td className="finance-cell-strong">{formatGBPWhole(group.total_gbp)}</td>
                                    <td className={group.total_gbp > targetToDate && targetToDate > 0 ? "finance-over" : ""}>
                                        {targetToDate > 0 ? formatGBPWhole(targetToDate) : "—"}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default function Insights() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [excludeRecurring, setExcludeRecurring] = useState(true)

    const { state, refreshing, reload } = useFinanceLoad<InsightsData>(async () => {
        const range = { after: `${year}-01-01`, before: `${year}-12-31` }
        // Year on year compares up to this month for the current year and the
        // whole year otherwise, and has no year before the first to compare.
        const month = year === now.getFullYear() ? now.getMonth() + 1 : 12
        const [yearly, yearOnYear, merchants, breakdown, unusual] = await Promise.all([
            financeApi.yearly(year),
            year > FIRST_YEAR ? financeApi.yearOnYear(year, month) : Promise.resolve(null),
            financeApi.merchantStats({ ...range, limit: 10 }),
            financeApi.breakdown({ ...range, exclude_recurring: excludeRecurring }),
            financeApi.unusual({ ...range, limit: 15 })
        ])
        return { yearly, yearOnYear, merchants, breakdown, unusual: unusual.spends }
    }, [year, excludeRecurring])

    return (
        <FinancePage state={state} refreshing={refreshing} onRefresh={reload} what="Insights">
            {({ yearly, yearOnYear, merchants, breakdown, unusual }) => {
                const vsTarget = yearly.total_gbp - yearly.target_to_date_gbp
                return (
                    <>
                        <div className="finance-header">
                            <Stepper
                                label={String(year)}
                                onPrev={() => setYear(year - 1)}
                                onNext={() => setYear(year + 1)}
                                nextDisabled={year >= now.getFullYear()}
                            />
                        </div>

                        <div className="stats-grid">
                            <StatTile value={formatGBPWhole(yearly.total_gbp)} label="Spent" />
                            <StatTile value={formatGBPWhole(yearly.average_per_month_gbp)} label="Per month" />
                            <StatTile value={formatGBPWhole(yearly.target_to_date_gbp)} label="Target to date" />
                            <StatTile
                                value={formatGBPWhole(Math.abs(vsTarget))}
                                label={vsTarget > 0 ? "Over target" : "Under target"}
                                tone={vsTarget > 0 ? "over" : "under"}
                            />
                            <StatTile value={String(yearly.transactions)} label="Spends" />
                            <StatTile value={formatGBPWhole(yearly.uncategorised_gbp)} label="Uncategorised" />
                        </div>

                        {yearOnYear && (
                            <div className="finance-columns">
                                <Comparison
                                    title={`${monthShort(yearOnYear.month)} against last year`}
                                    period={yearOnYear.month_comparison}
                                />
                                <Comparison title="Year to date against last year" period={yearOnYear.year_to_date} />
                            </div>
                        )}

                        <GroupTable yearly={yearly} />

                        <div className="finance-columns">
                            <RankedList
                                title="Most spent with"
                                items={merchants.by_spend.map((m) => ({
                                    key: m.merchant_id,
                                    name: (
                                        <Link className="finance-link" to={`/finance/transactions?merchant_id=${m.merchant_id}`}>
                                            {m.name}
                                        </Link>
                                    ),
                                    metric: formatGBPWhole(m.total_gbp),
                                    value: m.total_gbp,
                                    meta: `${spends(m.transactions)} · ${formatGBP(m.average_gbp)} each`
                                }))}
                            />
                            <RankedList
                                title="Most often spent at"
                                items={merchants.by_count.map((m) => ({
                                    key: m.merchant_id,
                                    name: (
                                        <Link className="finance-link" to={`/finance/transactions?merchant_id=${m.merchant_id}`}>
                                            {m.name}
                                        </Link>
                                    ),
                                    metric: spends(m.transactions),
                                    value: m.transactions,
                                    meta: `${formatGBPWhole(m.total_gbp)} · last ${formatDayShort(m.last_spent_on)}`
                                }))}
                            />
                        </div>

                        <label className="finance-checkbox finance-breakdown-toggle">
                            <input
                                type="checkbox"
                                checked={excludeRecurring}
                                onChange={(e) => setExcludeRecurring(e.target.checked)}
                            />
                            <span>Leave out recurring spends, so a bill on the 1st doesn't skew the days</span>
                        </label>
                        <div className="finance-columns">
                            <BarChart
                                title="Average per day of the week"
                                subtitle="Spent on that weekday, divided by how many there were"
                                data={breakdown.by_day_of_week.map((day) => ({
                                    label: weekdayShort(day.day),
                                    value: day.average_per_day_gbp
                                }))}
                                formatValue={formatGBPShort}
                            />
                            <RankedList
                                title="By payment method"
                                items={breakdown.by_payment_method.map((pm) => ({
                                    key: pm.payment_method_id,
                                    name: pm.name,
                                    metric: formatShare(pm.share_pct),
                                    value: pm.total_gbp,
                                    meta: `${formatGBPWhole(pm.total_gbp)} · ${spends(pm.transactions)}`
                                }))}
                            />
                            <RankedList
                                title="By time of day"
                                items={breakdown.by_time_of_day.map((slot) => ({
                                    key: slot.time_of_day ?? "none",
                                    name: labelFor(TIMES_OF_DAY, slot.time_of_day),
                                    metric: formatGBPWhole(slot.total_gbp),
                                    value: slot.total_gbp,
                                    meta: `${spends(slot.transactions)} · ${formatGBP(slot.average_gbp)} each`
                                }))}
                            />
                        </div>

                        <div className="finance-card">
                            <h4 className="top-list-title">Unusual spends</h4>
                            <p className="finance-muted">
                                At least three times their category's typical spend. Worth a look for one-offs and
                                typos.
                            </p>
                            {unusual.length === 0 ? (
                                <p className="finance-muted">None this year.</p>
                            ) : (
                                <ul className="finance-simple-list">
                                    {unusual.map((spend) => (
                                        <li key={spend.transaction_id}>
                                            <Link className="finance-link" to={`/finance/transactions/${spend.transaction_id}`}>
                                                {spend.merchant ?? spend.description ?? spend.category}
                                                <span className="finance-muted">
                                                    {" "}
                                                    · {spend.category} · {formatDay(spend.spent_on)}
                                                </span>
                                            </Link>
                                            <span>
                                                {formatGBP(spend.amount_gbp)}{" "}
                                                <span className="finance-muted">
                                                    ({spend.times_typical.toFixed(1)}× {formatGBP(spend.typical_gbp)})
                                                </span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )
            }}
        </FinancePage>
    )
}
