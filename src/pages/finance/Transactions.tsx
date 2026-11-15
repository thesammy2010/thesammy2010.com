import React, { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import {
    financeApi,
    loadReferences,
    References,
    Transaction,
    TransactionFilters,
    TRANSACTIONS_PAGE_SIZE,
    useFinanceLoad
} from "../../components/finance/api"
import FinancePage from "../../components/finance/FinancePage"
import TransactionForm from "../../components/finance/TransactionForm"
import { formatDay, formatGBP, spends } from "../../components/finance/format"
import { dedupeById } from "../../components/go_heavier/pagination"

const FILTER_KEYS: (keyof TransactionFilters)[] = ["after", "before", "category_id", "merchant_id", "payment_method_id"]

interface ListData {
    references: References
    firstPage: Transaction[]
}

export function groupByDay(transactions: Transaction[]): { day: string; total: number; items: Transaction[] }[] {
    const days: { day: string; total: number; items: Transaction[] }[] = []
    transactions.forEach((transaction) => {
        const last = days[days.length - 1]
        if (last && last.day === transaction.spent_on) {
            last.items.push(transaction)
            last.total += transaction.amount_gbp
        } else {
            days.push({ day: transaction.spent_on, total: transaction.amount_gbp, items: [transaction] })
        }
    })
    return days
}

function Filters({ references }: { references: References }) {
    const [searchParams, setSearchParams] = useSearchParams()

    const setFilter = (key: keyof TransactionFilters, value: string) => {
        const next = new URLSearchParams(searchParams)
        if (value) {
            next.set(key, value)
        } else {
            next.delete(key)
        }
        setSearchParams(next, { replace: true })
    }

    const active = FILTER_KEYS.some((key) => searchParams.get(key))

    return (
        <div className="finance-card finance-filters">
            <label>
                From
                <input type="date" value={searchParams.get("after") ?? ""} onChange={(e) => setFilter("after", e.target.value)} />
            </label>
            <label>
                To
                <input
                    type="date"
                    value={searchParams.get("before") ?? ""}
                    onChange={(e) => setFilter("before", e.target.value)}
                />
            </label>
            <label>
                Category
                <select
                    value={searchParams.get("category_id") ?? ""}
                    onChange={(e) => setFilter("category_id", e.target.value)}
                >
                    <option value="">All</option>
                    {references.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.group} › {category.name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Merchant
                <select
                    value={searchParams.get("merchant_id") ?? ""}
                    onChange={(e) => setFilter("merchant_id", e.target.value)}
                >
                    <option value="">All</option>
                    {references.merchants.map((merchant) => (
                        <option key={merchant.id} value={merchant.id}>
                            {merchant.name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Paid with
                <select
                    value={searchParams.get("payment_method_id") ?? ""}
                    onChange={(e) => setFilter("payment_method_id", e.target.value)}
                >
                    <option value="">All</option>
                    {references.paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                            {pm.name}
                        </option>
                    ))}
                </select>
            </label>
            {active && (
                <button type="button" className="finance-text-button" onClick={() => setSearchParams({}, { replace: true })}>
                    Clear filters
                </button>
            )}
        </div>
    )
}

export function TransactionRow({ transaction, references }: { transaction: Transaction; references: References }) {
    const merchant = references.merchants.find((m) => m.id === transaction.merchant_id)?.name
    const category = references.categories.find((c) => c.id === transaction.category_id)
    const paymentMethod = references.paymentMethods.find((pm) => pm.id === transaction.payment_method_id)

    return (
        <Link to={`/finance/transactions/${transaction.id}`} className="finance-row">
            <div className="finance-row-main">
                <span className="finance-row-title">
                    {merchant ?? transaction.description ?? "Unnamed spend"}
                    {transaction.relation && <span className="finance-badge">{transaction.relation}</span>}
                </span>
                <span className="finance-row-meta">
                    {category ? category.name : <span className="finance-warning">Uncategorised</span>}
                    {paymentMethod && ` · ${paymentMethod.name}`}
                    {merchant && transaction.description && ` · ${transaction.description}`}
                </span>
            </div>
            <span className={`finance-row-amount ${transaction.amount_gbp < 0 ? "finance-under" : ""}`}>
                {formatGBP(transaction.amount_gbp)}
                {transaction.original_amount != null && transaction.original_currency && (
                    <span className="finance-row-meta">
                        {transaction.original_amount.toLocaleString("en-GB")} {transaction.original_currency}
                    </span>
                )}
            </span>
        </Link>
    )
}

export default function Transactions() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const filters = useMemo(() => {
        const result: TransactionFilters = {}
        FILTER_KEYS.forEach((key) => {
            const value = searchParams.get(key)
            if (value) {
                result[key] = value
            }
        })
        return result
    }, [searchParams])
    const filterKey = JSON.stringify(filters)

    const { state, refreshing, reload } = useFinanceLoad<ListData>(async () => {
        const [references, firstPage] = await Promise.all([loadReferences(), financeApi.transactions(filters, 1)])
        return { references, firstPage }
    }, [filterKey])

    // Pages after the first, fetched on demand. Reset whenever the first page
    // is reloaded, since they'd belong to the previous filters.
    const [more, setMore] = useState<Transaction[]>([])
    const [nextPage, setNextPage] = useState(2)
    const [loadingMore, setLoadingMore] = useState(false)
    const [moreError, setMoreError] = useState<string | null>(null)
    const [lastPageShort, setLastPageShort] = useState(false)
    const [showForm, setShowForm] = useState(false)

    const firstPage = state.status === "ready" ? state.data.firstPage : null
    useEffect(() => {
        setMore([])
        setNextPage(2)
        setMoreError(null)
        setLastPageShort(false)
    }, [firstPage])

    const loadMore = async () => {
        setLoadingMore(true)
        setMoreError(null)
        try {
            const page = await financeApi.transactions(filters, nextPage)
            setMore((prev) => [...prev, ...page])
            setNextPage(nextPage + 1)
            setLastPageShort(page.length < TRANSACTIONS_PAGE_SIZE)
        } catch (error) {
            setMoreError((error as Error).message)
        } finally {
            setLoadingMore(false)
        }
    }

    return (
        <FinancePage state={state} refreshing={refreshing} onRefresh={reload} what="Transactions">
            {({ references, firstPage }) => {
                const transactions = dedupeById([...firstPage, ...more])
                const done = firstPage.length < TRANSACTIONS_PAGE_SIZE || lastPageShort
                const shownTotal = transactions.reduce((sum, t) => sum + t.amount_gbp, 0)

                return (
                    <>
                        <div className="finance-header">
                            <h2 className="finance-title">Transactions</h2>
                            <button className="finance-primary-button" onClick={() => setShowForm(true)}>
                                ➕ Add a spend
                            </button>
                        </div>

                        <Filters references={references} />

                        {transactions.length === 0 ? (
                            <div className="finance-card">
                                <p className="finance-muted">No spends match these filters.</p>
                            </div>
                        ) : (
                            <>
                                <p className="finance-muted finance-list-summary">
                                    {spends(transactions.length)}
                                    {done ? "" : "+"} ·{" "}
                                    {formatGBP(shownTotal)}
                                    {done ? "" : " so far"}
                                </p>
                                <div className="finance-days">
                                    {groupByDay(transactions).map((group) => (
                                        <section key={group.day} className="finance-day">
                                            <header className="finance-day-head">
                                                <span>{formatDay(group.day)}</span>
                                                <span>{formatGBP(group.total)}</span>
                                            </header>
                                            {group.items.map((transaction) => (
                                                <TransactionRow
                                                    key={transaction.id}
                                                    transaction={transaction}
                                                    references={references}
                                                />
                                            ))}
                                        </section>
                                    ))}
                                </div>
                                {moreError && <p className="error-message">{moreError}</p>}
                                {!done && (
                                    <button className="finance-secondary-button finance-load-more" onClick={loadMore} disabled={loadingMore}>
                                        {loadingMore ? "Loading..." : "Load more"}
                                    </button>
                                )}
                            </>
                        )}

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
