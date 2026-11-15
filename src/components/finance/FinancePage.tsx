import React from "react"

import SignInPrompt from "../SignInPrompt"
import FinanceNavBar from "./NavBar"
import { LoadState } from "./api"
import "../../pages/GoHeavier.css"
import "../go_heavier/Stats.css"
import "./Finance.css"

interface Props<T> {
    state: LoadState<T>
    refreshing: boolean
    onRefresh: () => void
    // What failed, for the error heading: "Failed to Load {what}".
    what: string
    children: (data: T) => React.ReactNode
}

// The frame every finance page shares: nav bar, then a spinner, a sign-in
// prompt, an error with a retry, or the page itself.
export default function FinancePage<T>({ state, refreshing, onRefresh, what, children }: Props<T>) {
    return (
        <div className="center-container-grid">
            <FinanceNavBar />
            <div className="page-container">
                {state.status === "loading" && (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                )}

                {state.status === "signedOut" && <SignInPrompt message="Sign in to view your finances." />}

                {state.status === "error" && (
                    <div className={`error-container ${refreshing ? "retrying" : ""}`}>
                        <h2>Failed to Load {what}</h2>
                        <p className="error-message">{state.message}</p>
                        <button onClick={onRefresh} disabled={refreshing}>
                            {refreshing ? (
                                <>
                                    <span className="button-spinner"></span>
                                    Retrying...
                                </>
                            ) : (
                                "Retry"
                            )}
                        </button>
                    </div>
                )}

                {state.status === "ready" && (
                    <>
                        {!refreshing && (
                            <button onClick={onRefresh} className="finance-refresh" title="Refresh">
                                ↻
                            </button>
                        )}
                        <div className={`finance-page ${refreshing ? "refreshing" : ""}`}>{children(state.data)}</div>
                    </>
                )}
            </div>
        </div>
    )
}

// A list where each row's bar is its share of the largest row, the same
// shape the Go Heavier stats use for top exercises and locations.
export function RankedList({
    title,
    items
}: {
    title: string
    items: { key: string; name: React.ReactNode; metric: string; value: number; meta?: React.ReactNode }[]
}) {
    const most = Math.max(...items.map((item) => item.value), 0) || 1
    return (
        <div className="finance-card">
            <h4 className="top-list-title">{title}</h4>
            {items.length === 0 ? (
                <p className="finance-muted">Nothing in this range.</p>
            ) : (
                <ol className="top-list">
                    {items.map((item) => (
                        <li key={item.key} className="top-list-item">
                            <div className="top-list-head">
                                <span className="top-list-name">{item.name}</span>
                                <span className="top-list-metric">{item.metric}</span>
                            </div>
                            <div className="top-list-bar-track">
                                <div
                                    className="top-list-bar"
                                    style={{ width: `${(Math.max(item.value, 0) / most) * 100}%` }}
                                />
                            </div>
                            {item.meta && <div className="top-list-meta">{item.meta}</div>}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}

export function StatTile({ value, label, tone }: { value: string; label: string; tone?: "over" | "under" }) {
    return (
        <div className="stat-tile">
            <div className={`stat-tile-value ${tone ? `finance-${tone}` : ""}`}>{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    )
}

// Prev / label / next, for stepping through months or years.
export function Stepper({
    label,
    onPrev,
    onNext,
    nextDisabled
}: {
    label: string
    onPrev: () => void
    onNext: () => void
    nextDisabled?: boolean
}) {
    return (
        <div className="finance-stepper">
            <button type="button" onClick={onPrev} aria-label="Previous">
                ‹
            </button>
            <span className="finance-stepper-label">{label}</span>
            <button type="button" onClick={onNext} disabled={nextDisabled} aria-label="Next">
                ›
            </button>
        </div>
    )
}
