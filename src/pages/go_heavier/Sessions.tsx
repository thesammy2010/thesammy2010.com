import React from "react"
import { useNavigate } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import { SESSIONS_CACHE_KEY, SessionSummary, fetchAllSessions } from "../../components/go_heavier/sessions"
import "../GoHeavier.css"
import "../../components/go_heavier/Stats.css"
import "./Sessions.css"

interface Props {
    navigate: (path: string) => void
}

interface State {
    loaded: boolean | null
    sessions?: SessionSummary[]
    isRefreshing: boolean
}

export class Sessions extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)

        const cachedData = sessionStorage.getItem(SESSIONS_CACHE_KEY)
        const cachedSessions = cachedData ? JSON.parse(cachedData) : undefined

        this.state = {
            loaded: cachedSessions ? true : null,
            sessions: cachedSessions,
            isRefreshing: false
        }
    }

    componentDidMount() {
        // Cached sessions render straight away; the refresh button is the only
        // thing that goes back to the API.
        if (!this.state.sessions) {
            this.fetchSessions()
        }
    }

    fetchSessions = async (minDuration: number = 300) => {
        const startedAt = Date.now()
        const waitOut = () => new Promise<void>(resolve =>
            setTimeout(resolve, Math.max(0, minDuration - (Date.now() - startedAt)))
        )

        this.setState({ isRefreshing: true })
        try {
            const sessions = await fetchAllSessions()
            sessionStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(sessions))

            await waitOut()
            this.setState({ sessions, loaded: true, isRefreshing: false })
        } catch (error) {
            console.error("Error fetching sessions:", error)
            await waitOut()
            this.setState({ loaded: false, isRefreshing: false })
        }
    }

    handleRefresh = () => {
        this.fetchSessions()
    }

    handleRetry = () => {
        // Keep the loading state on screen long enough to be visible
        this.fetchSessions(1000)
    }

    formatCount = (value: number): string => value.toLocaleString()

    formatWeight = (value: number): string => `${Math.round(value).toLocaleString()} kg`

    formatSessionDate = (value: string): string =>
        new Date(value).toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
        })

    formatSessionTime = (value: string): string =>
        new Date(value).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        })

    render(): React.ReactNode {
        const sessions = this.state.sessions ?? []
        const totalSets = sessions.reduce((sum, session) => sum + session.sets, 0)
        const totalVolume = sessions.reduce((sum, session) => sum + session.volume_kg, 0)

        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    {this.state.loaded && !this.state.isRefreshing && (
                        <button
                            onClick={this.handleRefresh}
                            className="refresh-arrow-button"
                            title="Refresh"
                        >
                            ↻
                        </button>
                    )}

                    {this.state.loaded === null && (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    )}

                    {this.state.loaded === false && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Sessions</h2>
                            <p className="error-message">Unable to fetch sessions from server</p>
                            <button onClick={this.handleRetry} disabled={this.state.isRefreshing}>
                                {this.state.isRefreshing ? (
                                    <>
                                        <span className="button-spinner"></span>
                                        Retrying...
                                    </>
                                ) : 'Retry'}
                            </button>
                        </div>
                    )}

                    {this.state.loaded && sessions.length === 0 && (
                        <div className="header">
                            <p>No sessions found.</p>
                        </div>
                    )}

                    {this.state.loaded && sessions.length > 0 && (
                        <div className={`sessions-page ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="stats-grid">
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatCount(sessions.length)}</div>
                                    <div className="stat-tile-label">Sessions</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatCount(totalSets)}</div>
                                    <div className="stat-tile-label">Sets</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatWeight(totalVolume)}</div>
                                    <div className="stat-tile-label">Total volume</div>
                                </div>
                            </div>

                            <div className="sessions-list">
                                {sessions.map((session) => (
                                    <button
                                        key={session.id}
                                        className="session-card"
                                        onClick={() => this.props.navigate(`/go-heavier/sessions/${session.id}`)}
                                    >
                                        <div className="session-card-head">
                                            <div className="session-when">
                                                <span className="session-date">
                                                    {this.formatSessionDate(session.workout_time)}
                                                </span>
                                                <span className="session-time">
                                                    {this.formatSessionTime(session.workout_time)}
                                                </span>
                                            </div>
                                            <span className="session-location">📍 {session.location}</span>
                                        </div>

                                        <div className="session-metrics">
                                            <div className="session-metric">
                                                <span className="session-metric-value">{session.exercises}</span>
                                                <span className="session-metric-label">Exercises</span>
                                            </div>
                                            <div className="session-metric">
                                                <span className="session-metric-value">{session.sets}</span>
                                                <span className="session-metric-label">Sets</span>
                                            </div>
                                            <div className="session-metric">
                                                <span className="session-metric-value">{this.formatCount(session.repetitions)}</span>
                                                <span className="session-metric-label">Reps</span>
                                            </div>
                                            <div className="session-metric">
                                                <span className="session-metric-value">{this.formatWeight(session.volume_kg)}</span>
                                                <span className="session-metric-label">Volume</span>
                                            </div>
                                            <div className="session-metric">
                                                <span className="session-metric-value">{this.formatWeight(session.heaviest_weight_kg)}</span>
                                                <span className="session-metric-label">Heaviest</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

// Wrapper component to use React Router hooks
export default function SessionsWithNavigate() {
    const navigate = useNavigate()
    return <Sessions navigate={navigate} />
}
