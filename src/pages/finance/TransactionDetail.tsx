import React, { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { financeApi, loadReferences, References, TransactionDetail as Detail, useFinanceLoad } from "../../components/finance/api"
import FinancePage from "../../components/finance/FinancePage"
import TransactionForm from "../../components/finance/TransactionForm"
import { formatDay, formatGBP, labelFor, TIMES_OF_DAY } from "../../components/finance/format"
import { TransactionRow } from "./Transactions"

interface DetailData {
    transaction: Detail
    references: References
}

function yesNo(value: boolean | null): string {
    return value === null ? "Not recorded" : value ? "Yes" : "No"
}

export default function TransactionDetail() {
    const { id = "" } = useParams()
    const navigate = useNavigate()
    const [form, setForm] = useState<"edit" | "linked" | null>(null)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const { state, refreshing, reload } = useFinanceLoad<DetailData>(async () => {
        const [transaction, references] = await Promise.all([financeApi.transaction(id), loadReferences()])
        return { transaction, references }
    }, [id])

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError(null)
        try {
            await financeApi.deleteTransaction(id)
            navigate("/finance/transactions")
        } catch (error) {
            setDeleteError((error as Error).message)
            setDeleting(false)
        }
    }

    return (
        <FinancePage state={state} refreshing={refreshing} onRefresh={reload} what="Transaction">
            {({ transaction, references }) => {
                const merchant = references.merchants.find((m) => m.id === transaction.merchant_id)
                const category = references.categories.find((c) => c.id === transaction.category_id)
                const paymentMethod = references.paymentMethods.find((pm) => pm.id === transaction.payment_method_id)
                // Links only go one level deep, so a spend that belongs to
                // another can't have its own linked spends.
                const canLink = !transaction.related_to_id

                const rows: [string, React.ReactNode][] = [
                    ["Date", formatDay(transaction.spent_on)],
                    [
                        "Merchant",
                        merchant ? (
                            <Link className="finance-link" to={`/finance/transactions?merchant_id=${merchant.id}`}>
                                {merchant.name}
                            </Link>
                        ) : (
                            "None"
                        )
                    ],
                    [
                        "Category",
                        category ? (
                            <Link className="finance-link" to={`/finance/transactions?category_id=${category.id}`}>
                                {category.group} › {category.name}
                            </Link>
                        ) : (
                            <span className="finance-warning">Uncategorised</span>
                        )
                    ],
                    ["Paid with", paymentMethod?.name ?? "Unknown"],
                    ["Description", transaction.description ?? "None"],
                    ["Time of day", labelFor(TIMES_OF_DAY, transaction.time_of_day)],
                    ["Necessary", yesNo(transaction.is_necessary)],
                    ["Recurring", yesNo(transaction.is_recurring)],
                    ["With partner", yesNo(transaction.with_partner)]
                ]
                if (transaction.original_amount != null) {
                    rows.push([
                        "Original amount",
                        `${transaction.original_amount.toLocaleString("en-GB")} ${transaction.original_currency ?? ""}`
                    ])
                }
                if (transaction.exchange_rate != null) {
                    rows.push(["Card's rate", `${transaction.exchange_rate.toFixed(4)} per £`])
                }
                if (
                    transaction.effective_exchange_rate != null &&
                    transaction.effective_exchange_rate !== transaction.exchange_rate
                ) {
                    rows.push(["Rate after fees", `${transaction.effective_exchange_rate.toFixed(4)} per £`])
                }

                return (
                    <>
                        <div className="finance-header">
                            <Link className="finance-link" to="/finance/transactions">
                                ← All transactions
                            </Link>
                        </div>

                        <div className="finance-card finance-detail">
                            <div className="finance-detail-head">
                                <div>
                                    <h2 className="finance-title">
                                        {merchant?.name ?? transaction.description ?? "Unnamed spend"}
                                    </h2>
                                    {transaction.related_to_id && (
                                        <p className="finance-muted">
                                            A {transaction.relation} for{" "}
                                            <Link className="finance-link" to={`/finance/transactions/${transaction.related_to_id}`}>
                                                another spend
                                            </Link>
                                        </p>
                                    )}
                                </div>
                                <div className="finance-detail-amount">
                                    <span className={transaction.amount_gbp < 0 ? "finance-under" : ""}>
                                        {formatGBP(transaction.amount_gbp)}
                                    </span>
                                    {transaction.related.length > 0 && (
                                        <span className="finance-muted">{formatGBP(transaction.total_gbp)} in total</span>
                                    )}
                                </div>
                            </div>

                            <dl className="finance-fields">
                                {rows.map(([label, value]) => (
                                    <React.Fragment key={label}>
                                        <dt>{label}</dt>
                                        <dd>{value}</dd>
                                    </React.Fragment>
                                ))}
                            </dl>

                            <div className="finance-actions">
                                <button className="finance-secondary-button" onClick={() => setForm("edit")}>
                                    Edit
                                </button>
                                {canLink && (
                                    <button className="finance-secondary-button" onClick={() => setForm("linked")}>
                                        Add a fee or refund
                                    </button>
                                )}
                                {!confirmingDelete ? (
                                    <button className="finance-danger-button" onClick={() => setConfirmingDelete(true)}>
                                        Delete
                                    </button>
                                ) : (
                                    <span className="finance-confirm">
                                        Delete this spend?
                                        <button className="finance-secondary-button" onClick={() => setConfirmingDelete(false)}>
                                            Cancel
                                        </button>
                                        <button className="finance-danger-button" onClick={handleDelete} disabled={deleting}>
                                            {deleting ? "Deleting..." : "Confirm"}
                                        </button>
                                    </span>
                                )}
                            </div>
                            {deleteError && <p className="error-message">{deleteError}</p>}
                            {confirmingDelete && (
                                <p className="finance-muted">
                                    If this came from the Google Sheet, it comes back on the next import unless it's
                                    removed there too.
                                </p>
                            )}
                        </div>

                        {transaction.related.length > 0 && (
                            <div className="finance-card">
                                <h4 className="top-list-title">Linked spends</h4>
                                {transaction.related.map((related) => (
                                    <TransactionRow key={related.id} transaction={related} references={references} />
                                ))}
                            </div>
                        )}

                        {form && (
                            <TransactionForm
                                references={references}
                                transaction={form === "edit" ? transaction : undefined}
                                relatedTo={form === "linked" ? transaction : undefined}
                                onClose={() => setForm(null)}
                                // A new linked spend shows up in this page's
                                // list, so both cases just reload it.
                                onSaved={() => {
                                    setForm(null)
                                    reload()
                                }}
                            />
                        )}
                    </>
                )
            }}
        </FinancePage>
    )
}
