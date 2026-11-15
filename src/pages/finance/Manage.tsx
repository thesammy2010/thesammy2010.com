import React, { useState } from "react"

import {
    financeApi,
    invalidateReferences,
    loadReferences,
    MigrationResult,
    PaymentMethod,
    PaymentMethodKind,
    References,
    useFinanceLoad
} from "../../components/finance/api"
import FinancePage from "../../components/finance/FinancePage"
import { labelFor, PAYMENT_METHOD_KINDS } from "../../components/finance/format"

function PaymentMethods({ paymentMethods, onChanged }: { paymentMethods: PaymentMethod[]; onChanged: () => void }) {
    const [name, setName] = useState("")
    const [kind, setKind] = useState<PaymentMethodKind>("debit_card")
    const [busyId, setBusyId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const run = async (id: string, action: () => Promise<unknown>) => {
        setBusyId(id)
        setError(null)
        try {
            await action()
            invalidateReferences()
            onChanged()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusyId(null)
        }
    }

    const add = (e: React.FormEvent) => {
        e.preventDefault()
        run("new", async () => {
            await financeApi.createPaymentMethod({ name: name.trim(), kind, is_active: true })
            setName("")
        })
    }

    return (
        <div className="finance-card">
            <h4 className="top-list-title">Payment methods</h4>
            <p className="finance-muted">
                A retired one stays on the spends already paid with it but isn't offered for new ones.
            </p>
            <ul className="finance-simple-list">
                {paymentMethods.map((pm) => (
                    <li key={pm.id} className={pm.is_active ? "" : "finance-retired"}>
                        <span>
                            {pm.name}
                            <span className="finance-muted"> · {labelFor(PAYMENT_METHOD_KINDS, pm.kind)}</span>
                        </span>
                        <button
                            className="finance-text-button"
                            disabled={busyId !== null}
                            onClick={() =>
                                run(pm.id, () =>
                                    financeApi.updatePaymentMethod(pm.id, {
                                        name: pm.name,
                                        kind: pm.kind,
                                        is_active: !pm.is_active
                                    })
                                )
                            }
                        >
                            {busyId === pm.id ? "Saving..." : pm.is_active ? "Retire" : "Reactivate"}
                        </button>
                    </li>
                ))}
            </ul>
            <form className="finance-inline-form" onSubmit={add}>
                <input
                    className="finance-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New card or account"
                    maxLength={64}
                    required
                    aria-label="Payment method name"
                />
                <select
                    className="finance-input"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as PaymentMethodKind)}
                    aria-label="Payment method kind"
                >
                    {PAYMENT_METHOD_KINDS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button type="submit" className="finance-secondary-button" disabled={busyId !== null}>
                    {busyId === "new" ? "Adding..." : "Add"}
                </button>
            </form>
            {error && <p className="error-message">{error}</p>}
        </div>
    )
}

function SheetImport({ onImported }: { onImported: () => void }) {
    const [dryRun, setDryRun] = useState(true)
    const [after, setAfter] = useState("")
    const [before, setBefore] = useState("")
    const [running, setRunning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<MigrationResult | null>(null)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setRunning(true)
        setError(null)
        setResult(null)
        try {
            const outcome = await financeApi.runMigration({
                dry_run: dryRun,
                after: after || undefined,
                before: before || undefined
            })
            setResult(outcome)
            if (!outcome.dry_run) {
                invalidateReferences()
                onImported()
            }
        } catch (err) {
            const status = (err as { status?: number }).status
            setError(status === 503 ? "The finance sheet isn't configured on the server." : (err as Error).message)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="finance-card">
            <h4 className="top-list-title">Import from the Google Sheet</h4>
            <p className="finance-muted">
                Loads every month tab from the Financial Spend sheet. Spends already imported are updated in place,
                and spends dated after today are skipped.
            </p>
            <form className="finance-import-form" onSubmit={submit}>
                <div className="finance-filters">
                    <label>
                        Spent on or after
                        <input type="date" value={after} onChange={(e) => setAfter(e.target.value)} />
                    </label>
                    <label>
                        Spent on or before
                        <input type="date" value={before} onChange={(e) => setBefore(e.target.value)} />
                    </label>
                </div>
                <label className="finance-checkbox">
                    <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                    <span>Dry run: read the sheet but write nothing, including ids back to the sheet</span>
                </label>
                <button type="submit" className="finance-primary-button" disabled={running}>
                    {running ? "Running..." : dryRun ? "Preview import" : "Run import"}
                </button>
            </form>
            {error && <p className="error-message">{error}</p>}
            {result && (
                <div className="finance-import-result">
                    <h5 className="finance-subheading">{result.dry_run ? "Dry run results" : "Import complete"}</h5>
                    <div className="finance-table-wrapper">
                        <table className="finance-table">
                            <thead>
                                <tr>
                                    <th>Table</th>
                                    <th>Rows read</th>
                                    <th>Rows written</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.results.map((row) => (
                                    <tr key={row.table}>
                                        <th scope="row">{row.table.replace("_", " ")}</th>
                                        <td>{row.rows}</td>
                                        <td>{row.written}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="finance-muted">
                        {result.ids_assigned} {result.ids_assigned === 1 ? "spend" : "spends"} without an id
                        {result.dry_run ? " would be given one" : " given one in the sheet"} ·{" "}
                        {result.uncategorised} left uncategorised
                    </p>
                </div>
            )}
        </div>
    )
}

export default function Manage() {
    const { state, refreshing, reload } = useFinanceLoad<References>(() => loadReferences(), [])

    return (
        <FinancePage state={state} refreshing={refreshing} onRefresh={reload} what="Settings">
            {(references) => (
                <>
                    <div className="finance-header">
                        <h2 className="finance-title">Manage</h2>
                    </div>
                    <div className="finance-columns">
                        <PaymentMethods paymentMethods={references.paymentMethods} onChanged={reload} />
                        <SheetImport onImported={reload} />
                    </div>
                </>
            )}
        </FinancePage>
    )
}
