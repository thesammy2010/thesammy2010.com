import React, { useMemo, useState } from "react"

import {
    financeApi,
    invalidateReferences,
    References,
    TimeOfDay,
    Transaction,
    TransactionInput,
    TransactionRelation
} from "./api"
import { TIMES_OF_DAY, today } from "./format"
import "../go_heavier/LocationForm.css"
import "./Finance.css"

interface Props {
    references: References
    // Set to edit a spend; left out to record a new one.
    transaction?: Transaction
    // Records the new spend against this one, such as a fee charged for it.
    relatedTo?: Transaction
    onClose: () => void
    onSaved: (transaction: Transaction) => void
}

const RELATIONS: { value: TransactionRelation; label: string }[] = [
    { value: "fee", label: "Fee charged for it" },
    { value: "refund", label: "Refund of it" },
    { value: "other", label: "Other" }
]

type TriState = "" | "yes" | "no"

function toTriState(value: boolean | null | undefined): TriState {
    return value === true ? "yes" : value === false ? "no" : ""
}

function fromTriState(value: TriState): boolean | null {
    return value === "yes" ? true : value === "no" ? false : null
}

function normalise(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLowerCase()
}

export default function TransactionForm({ references, transaction, relatedTo, onClose, onSaved }: Props) {
    const { categories, merchants, paymentMethods } = references
    const merchantName = merchants.find((m) => m.id === transaction?.merchant_id)?.name ?? ""

    const [spentOn, setSpentOn] = useState(transaction?.spent_on ?? relatedTo?.spent_on ?? today())
    const [amount, setAmount] = useState(transaction ? String(transaction.amount_gbp) : "")
    const [paymentMethodId, setPaymentMethodId] = useState(
        transaction?.payment_method_id ?? relatedTo?.payment_method_id ?? ""
    )
    const [merchant, setMerchant] = useState(merchantName)
    const [categoryId, setCategoryId] = useState(transaction?.category_id ?? relatedTo?.category_id ?? "")
    const [description, setDescription] = useState(transaction?.description ?? "")
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | "">(transaction?.time_of_day ?? "")
    const [necessary, setNecessary] = useState<TriState>(toTriState(transaction?.is_necessary))
    const [recurring, setRecurring] = useState<TriState>(toTriState(transaction?.is_recurring))
    const [withPartner, setWithPartner] = useState<TriState>(toTriState(transaction?.with_partner))
    const [abroad, setAbroad] = useState(Boolean(transaction?.original_amount))
    const [originalAmount, setOriginalAmount] = useState(
        transaction?.original_amount != null ? String(transaction.original_amount) : ""
    )
    const [originalCurrency, setOriginalCurrency] = useState(transaction?.original_currency ?? "")
    const relatedToId = transaction?.related_to_id ?? relatedTo?.id ?? null
    const [relation, setRelation] = useState<TransactionRelation>(transaction?.relation ?? "fee")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Retired cards stay listed only for a spend already paid with one.
    const usablePaymentMethods = paymentMethods.filter((pm) => pm.is_active || pm.id === paymentMethodId)

    const groupedCategories = useMemo(() => {
        const groups = new Map<string, typeof categories>()
        categories.forEach((category) => {
            groups.set(category.group, [...(groups.get(category.group) ?? []), category])
        })
        return Array.from(groups.entries())
    }, [categories])

    // A merchant typed that doesn't exist yet is created on save, matched the
    // way the API checks for duplicates: ignoring case and spacing.
    const resolveMerchant = async (): Promise<string | null> => {
        if (!merchant.trim()) {
            return null
        }
        const existing = merchants.find((m) => normalise(m.name) === normalise(merchant))
        if (existing) {
            return existing.id
        }
        const created = await financeApi.createMerchant(merchant.trim().replace(/\s+/g, " "))
        invalidateReferences()
        return created.id
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        try {
            const body: TransactionInput = {
                spent_on: spentOn,
                amount_gbp: Number(amount),
                original_amount: abroad && originalAmount ? Number(originalAmount) : null,
                original_currency: abroad && originalAmount && originalCurrency ? originalCurrency.toUpperCase() : null,
                payment_method_id: paymentMethodId,
                merchant_id: await resolveMerchant(),
                category_id: categoryId || null,
                description: description.trim() || null,
                is_necessary: fromTriState(necessary),
                is_recurring: fromTriState(recurring),
                with_partner: fromTriState(withPartner),
                time_of_day: timeOfDay || null,
                related_to_id: relatedToId,
                relation: relatedToId ? relation : null
            }
            const saved = transaction
                ? await financeApi.updateTransaction(transaction.id, body)
                : await financeApi.createTransaction(body)
            onSaved(saved)
        } catch (err) {
            setError((err as Error).message)
            setSaving(false)
        }
    }

    const triState = (label: string, value: TriState, onChange: (value: TriState) => void) => (
        <label>
            {label}
            <select value={value} onChange={(e) => onChange(e.target.value as TriState)}>
                <option value="">Not recorded</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
            </select>
        </label>
    )

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-form finance-form" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close">
                    ✖
                </button>
                <h2>{transaction ? "Edit spend" : relatedTo ? "Add a linked spend" : "Add a spend"}</h2>
                <form onSubmit={handleSubmit}>
                    {relatedToId && (
                        <label>
                            <span>How it relates <span className="required">*</span></span>
                            <select value={relation} onChange={(e) => setRelation(e.target.value as TransactionRelation)}>
                                {RELATIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <div className="finance-form-row">
                        <label>
                            <span>Date <span className="required">*</span></span>
                            <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required />
                        </label>
                        <label>
                            <span>Amount (£) <span className="required">*</span></span>
                            <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Negative for a refund"
                                required
                                autoFocus={!transaction}
                            />
                        </label>
                    </div>

                    <label>
                        Merchant
                        <input
                            type="text"
                            list="finance-merchants"
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                            placeholder="Pick one or type a new name"
                        />
                        <datalist id="finance-merchants">
                            {merchants.map((m) => (
                                <option key={m.id} value={m.name} />
                            ))}
                        </datalist>
                    </label>

                    <label>
                        Category
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">Uncategorised</option>
                            {groupedCategories.map(([group, items]) => (
                                <optgroup key={group} label={group}>
                                    {items.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Paid with <span className="required">*</span></span>
                        <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} required>
                            <option value="" disabled>
                                Choose a payment method
                            </option>
                            {usablePaymentMethods.map((pm) => (
                                <option key={pm.id} value={pm.id}>
                                    {pm.name}
                                    {pm.is_active ? "" : " (retired)"}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Description
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={512}
                        />
                    </label>

                    <div className="finance-form-row">
                        <label>
                            Time of day
                            <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay | "")}>
                                <option value="">Not recorded</option>
                                {TIMES_OF_DAY.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {triState("Necessary", necessary, setNecessary)}
                    </div>
                    <div className="finance-form-row">
                        {triState("Recurring", recurring, setRecurring)}
                        {triState("With partner", withPartner, setWithPartner)}
                    </div>

                    <label className="finance-checkbox">
                        <input type="checkbox" checked={abroad} onChange={(e) => setAbroad(e.target.checked)} />
                        <span>Spent in another currency</span>
                    </label>
                    {abroad && (
                        <div className="finance-form-row">
                            <label>
                                Original amount
                                <input
                                    type="number"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={originalAmount}
                                    onChange={(e) => setOriginalAmount(e.target.value)}
                                />
                            </label>
                            <label>
                                Currency
                                <input
                                    type="text"
                                    value={originalCurrency}
                                    onChange={(e) => setOriginalCurrency(e.target.value.toUpperCase())}
                                    maxLength={3}
                                    pattern="[A-Za-z]{3}"
                                    placeholder="e.g. EUR"
                                />
                            </label>
                        </div>
                    )}

                    {error && <p className="error-message">{error}</p>}
                    <div className="form-actions">
                        <button type="submit" disabled={saving}>
                            {saving ? "Saving..." : transaction ? "Save changes" : "Add spend"}
                        </button>
                        <button type="button" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
