import React from "react"

import SignInPrompt from "../SignInPrompt"
import SquashNavBar from "./NavBar"
import { LoadState, Player } from "./api"
import "../../pages/GoHeavier.css"
import "../go_heavier/Stats.css"
import "./Squash.css"

interface Props<T> {
    state: LoadState<T>
    refreshing: boolean
    onRefresh: () => void
    // What failed, for the error heading: "Failed to Load {what}".
    what: string
    children: (data: T, me: Player | null) => React.ReactNode
}

// The frame every squash page shares: nav bar, then a spinner, a sign-in
// prompt, a not-in-the-group notice, an error with a retry, or the page.
export default function SquashPage<T>({ state, refreshing, onRefresh, what, children }: Props<T>) {
    return (
        <div className="center-container-grid">
            <SquashNavBar />
            <div className="page-container">
                {state.status === "loading" && (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                )}

                {state.status === "signedOut" && <SignInPrompt message="Sign in to see your squash matches." />}

                {state.status === "denied" && (
                    <div className="error-container">
                        <h2>Not in the squash group</h2>
                        <p className="error-message">
                            Squash is for the group's players. Ask an admin to add you with the email you sign in
                            with.
                        </p>
                    </div>
                )}

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
                    <div className={`squash-page ${refreshing ? "refreshing" : ""}`}>
                        {children(state.data, state.me)}
                    </div>
                )}
            </div>
        </div>
    )
}
