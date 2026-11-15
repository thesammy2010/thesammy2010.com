// Types and requests for the /finance API. Every route there is admin-only,
// so pages gate on a single canAccess check (see useFinanceLoad) rather than
// one per endpoint.
import { useEffect, useRef, useState } from "react"

import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { isAccessReady, isSignedIn, subscribeAccessReady, useCanAccess } from "../../roles"

export type PaymentMethodKind =
    | "credit_card"
    | "debit_card"
    | "cash"
    | "shared_expense"
    | "transit_card"
    | "other"

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | "online"

export type TransactionRelation = "fee" | "refund" | "other"

export interface Category {
    id: string
    group: string
    name: string
}

export interface Merchant {
    id: string
    name: string
}

export interface PaymentMethod {
    id: string
    name: string
    kind: PaymentMethodKind
    is_active: boolean
}

export interface TransactionInput {
    spent_on: string
    amount_gbp: number
    original_amount: number | null
    original_currency: string | null
    payment_method_id: string
    merchant_id: string | null
    category_id: string | null
    description: string | null
    is_necessary: boolean | null
    is_recurring: boolean | null
    with_partner: boolean | null
    time_of_day: TimeOfDay | null
    related_to_id: string | null
    relation: TransactionRelation | null
}

export interface Transaction extends TransactionInput {
    id: string
    created_at: string
    updated_at: string
}

export interface TransactionDetail extends Transaction {
    related: Transaction[]
    total_gbp: number
    exchange_rate: number | null
    effective_exchange_rate: number | null
}

export interface Budget {
    id: string
    category_id: string
    year: number
    monthly_target_gbp: number
    rationale: string | null
}

export interface CategorySpend {
    category_id: string
    group: string
    name: string
    spent_gbp: number
    transactions: number
    target_gbp: number | null
}

export interface PendingRecurring {
    merchant_id: string | null
    merchant: string | null
    category_id: string | null
    description: string | null
    amount_gbp: number
    expected_on: string
}

export interface MonthForecast {
    as_of: string
    days_elapsed: number
    days_in_month: number
    average_per_day_gbp: number
    discretionary_per_day_gbp: number
    pending_recurring_gbp: number
    pending_recurring: PendingRecurring[]
    projected_total_gbp: number
}

export interface MonthlyStats {
    year: number
    month: number
    total_gbp: number
    transactions: number
    necessary_gbp: number
    discretionary_gbp: number
    recurring_gbp: number
    with_partner_gbp: number
    uncategorised_gbp: number
    target_gbp: number
    categories: CategorySpend[]
    forecast: MonthForecast | null
}

export interface CategoryYear {
    category_id: string
    group: string
    name: string
    months: number[]
    total_gbp: number
    average_gbp: number
    target_gbp: number | null
    target_to_date_gbp: number | null
    over_target_gbp: number | null
}

export interface GroupYear {
    group: string
    months: number[]
    total_gbp: number
    target_gbp: number
}

export interface YearlyStats {
    year: number
    months_elapsed: number
    total_gbp: number
    transactions: number
    average_per_month_gbp: number
    target_gbp: number
    target_to_date_gbp: number
    uncategorised_gbp: number
    months: { month: number; total_gbp: number; running_total_gbp: number }[]
    groups: GroupYear[]
    categories: CategoryYear[]
}

export interface MerchantSpend {
    merchant_id: string
    name: string
    total_gbp: number
    transactions: number
    average_gbp: number
    last_spent_on: string
}

export interface MerchantStats {
    total_gbp: number
    by_spend: MerchantSpend[]
    by_count: MerchantSpend[]
}

export interface CategoryComparison {
    category_id: string
    group: string
    name: string
    total_gbp: number
    previous_total_gbp: number
    change_gbp: number
    change_pct: number | null
}

export interface PeriodComparison {
    start: string
    end: string
    previous_start: string
    previous_end: string
    total_gbp: number
    previous_total_gbp: number
    change_gbp: number
    change_pct: number | null
    categories: CategoryComparison[]
}

export interface YearOnYear {
    year: number
    month: number
    month_comparison: PeriodComparison
    year_to_date: PeriodComparison
}

export interface UnusualSpend {
    transaction_id: string
    spent_on: string
    amount_gbp: number
    merchant: string | null
    description: string | null
    category_id: string
    category: string
    typical_gbp: number
    times_typical: number
}

export interface Breakdown {
    start: string | null
    end: string | null
    total_gbp: number
    transactions: number
    by_payment_method: {
        payment_method_id: string
        name: string
        kind: string
        total_gbp: number
        transactions: number
        average_gbp: number
        share_pct: number
    }[]
    by_day_of_week: { day: string; total_gbp: number; transactions: number; average_per_day_gbp: number }[]
    by_time_of_day: { time_of_day: string | null; total_gbp: number; transactions: number; average_gbp: number }[]
}

export interface MigrationResult {
    dry_run: boolean
    ids_assigned: number
    uncategorised: number
    results: { table: string; rows: number; written: number }[]
}

// Matches DEFAULT_DB_PAGE_SIZE on the API: a shorter page is the last one.
export const TRANSACTIONS_PAGE_SIZE = 50

// FastAPI puts the reason for a 400/404/409 in `detail`, which says far more
// than a generic fallback ("Category not found" rather than "Failed to save").
// A 422's detail is a list of field errors, so that falls back to the first
// one's message.
async function toError(response: Response, fallback: string): Promise<ApiError> {
    if (response.status === 403) {
        return new ApiError(403, fallback)
    }
    try {
        const body = await response.json()
        const detail = body?.detail
        if (typeof detail === "string") {
            return new ApiError(response.status, detail)
        }
        if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
            return new ApiError(response.status, detail[0].msg)
        }
    } catch {
        // Not JSON; use the fallback.
    }
    return new ApiError(response.status, fallback)
}

type Query = Record<string, string | number | boolean | null | undefined>

function withQuery(path: string, query: Query = {}): string {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            params.set(key, String(value))
        }
    })
    const search = params.toString()
    return `${API_URL}/finance${path}${search ? `?${search}` : ""}`
}

async function request<T>(
    method: string,
    path: string,
    fallback: string,
    { query, body }: { query?: Query; body?: unknown } = {}
): Promise<T> {
    const response = await apiFetch(withQuery(path, query), {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!response.ok) {
        throw await toError(response, fallback)
    }
    return response.status === 204 ? (undefined as T) : response.json()
}

export interface TransactionFilters {
    after?: string
    before?: string
    category_id?: string
    merchant_id?: string
    payment_method_id?: string
}

export const financeApi = {
    categories: () => request<Category[]>("GET", "/categories", "Failed to load categories"),
    merchants: () => request<Merchant[]>("GET", "/merchants", "Failed to load merchants"),
    createMerchant: (name: string) =>
        request<Merchant>("POST", "/merchants", "Failed to add the merchant", { body: { name } }),
    paymentMethods: () => request<PaymentMethod[]>("GET", "/payment-methods", "Failed to load payment methods"),
    createPaymentMethod: (body: Omit<PaymentMethod, "id">) =>
        request<PaymentMethod>("POST", "/payment-methods", "Failed to add the payment method", { body }),
    updatePaymentMethod: (id: string, body: Omit<PaymentMethod, "id">) =>
        request<PaymentMethod>("PUT", `/payment-methods/${id}`, "Failed to update the payment method", { body }),

    transactions: (filters: TransactionFilters, page: number) =>
        request<Transaction[]>("GET", "/transactions", "Failed to load transactions", {
            query: { ...filters, page }
        }),
    transaction: (id: string) => request<TransactionDetail>("GET", `/transactions/${id}`, "Failed to load the transaction"),
    createTransaction: (body: TransactionInput) =>
        request<Transaction>("POST", "/transactions", "Failed to save the transaction", { body }),
    updateTransaction: (id: string, body: TransactionInput) =>
        request<Transaction>("PUT", `/transactions/${id}`, "Failed to save the transaction", { body }),
    deleteTransaction: (id: string) =>
        request<void>("DELETE", `/transactions/${id}`, "Failed to delete the transaction"),

    budgets: (year: number) => request<Budget[]>("GET", "/budgets", "Failed to load budgets", { query: { year } }),
    putBudget: (year: number, categoryId: string, body: { monthly_target_gbp: number; rationale: string | null }) =>
        request<Budget>("PUT", `/budgets/${year}/${categoryId}`, "Failed to save the budget", { body }),

    monthly: (year: number, month: number) =>
        request<MonthlyStats>("GET", "/stats/monthly", "Failed to load the month", { query: { year, month } }),
    yearly: (year: number) => request<YearlyStats>("GET", "/stats/yearly", "Failed to load the year", { query: { year } }),
    merchantStats: (query: { after?: string; before?: string; limit?: number }) =>
        request<MerchantStats>("GET", "/stats/merchants", "Failed to load merchants", { query }),
    yearOnYear: (year: number, month: number) =>
        request<YearOnYear>("GET", "/stats/year-on-year", "Failed to load the comparison", { query: { year, month } }),
    unusual: (query: { after?: string; before?: string; limit?: number }) =>
        request<{ spends: UnusualSpend[] }>("GET", "/stats/unusual", "Failed to load unusual spends", { query }),
    breakdown: (query: { after?: string; before?: string; exclude_recurring?: boolean }) =>
        request<Breakdown>("GET", "/stats/breakdown", "Failed to load the breakdown", { query }),

    runMigration: (body: { dry_run: boolean; after?: string; before?: string }) =>
        request<MigrationResult>("POST", "/migrations", "Failed to run the import", { body })
}

export interface References {
    categories: Category[]
    merchants: Merchant[]
    paymentMethods: PaymentMethod[]
}

// Every page needs the categories, merchants and payment methods to put
// names to ids, so one load is shared for the life of the page. Held in
// memory only: sign-out reloads the app, which drops it.
let references: Promise<References> | null = null

export function loadReferences(): Promise<References> {
    if (!references) {
        references = Promise.all([financeApi.categories(), financeApi.merchants(), financeApi.paymentMethods()]).then(
            ([categories, merchants, paymentMethods]) => ({ categories, merchants, paymentMethods })
        )
        // A failed load shouldn't stick; the next page or retry tries again.
        references.catch(() => {
            references = null
        })
    }
    return references
}

// After adding a merchant or changing a payment method.
export function invalidateReferences(): void {
    references = null
}

export type LoadState<T> =
    | { status: "loading" }
    | { status: "signedOut" }
    | { status: "error"; message: string }
    | { status: "ready"; data: T }

function useAccessReady(): boolean {
    const [ready, setReady] = useState(isAccessReady())
    useEffect(() => subscribeAccessReady(() => setReady(true)), [])
    return ready
}

/**
 * Runs `load` once the caller's role is known, and again whenever `deps`
 * change or reload() is called. Signing in from the prompt re-runs it too:
 * that changes the access map, which useCanAccess re-renders on.
 *
 * Data from the previous load stays in `state` while the next one is in
 * flight (with `refreshing` set), so stepping between months dims the page
 * instead of blanking it.
 */
export function useFinanceLoad<T>(load: () => Promise<T>, deps: unknown[]) {
    const ready = useAccessReady()
    const allowed = useCanAccess("GET", "/finance/transactions")
    const [state, setState] = useState<LoadState<T>>({ status: "loading" })
    const [refreshing, setRefreshing] = useState(false)
    const [nonce, setNonce] = useState(0)
    const loadRef = useRef(load)
    loadRef.current = load

    useEffect(() => {
        if (!ready) {
            return
        }
        if (!isSignedIn()) {
            setState({ status: "signedOut" })
            return
        }
        if (!allowed) {
            setState({ status: "error", message: PERMISSION_DENIED_MESSAGE })
            return
        }

        let cancelled = false
        setRefreshing(true)
        loadRef.current().then(
            (data) => {
                if (!cancelled) {
                    setState({ status: "ready", data })
                    setRefreshing(false)
                }
            },
            (error) => {
                if (!cancelled) {
                    console.error("Error loading finance data:", error)
                    setState({ status: "error", message: (error as Error).message })
                    setRefreshing(false)
                }
            }
        )
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, allowed, nonce, ...deps])

    // A reload is a request for current data, so the shared references are
    // fetched again too rather than served from memory.
    const reload = () => {
        invalidateReferences()
        setNonce((n) => n + 1)
    }

    return { state, refreshing, reload }
}
