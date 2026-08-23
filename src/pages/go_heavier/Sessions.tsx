import React from "react"
import { useNavigate } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import SessionForm from "../../components/go_heavier/SessionForm"
import {
    SESSIONS_CACHE_KEY,
    SessionHighlight,
    SessionStats,
    SessionSummary,
    WeekdayStats,
    fetchAllSessions,
    fetchSessionStats
} from "../../components/go_heavier/sessions"
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
    stats: SessionStats | null
    statsLoading: boolean
    statsError: string | null
    showForm: boolean
}

export class Sessions extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)

        const cachedData = sessionStorage.getItem(SESSIONS_CACHE_KEY)
        const cachedSessions = cachedData ? JSON.parse(cachedData) : undefined

        this.state = {
            loaded: cachedSessions ? true : null,
            sessions: cachedSessions,
            isRefreshing: false,
            stats: null,
            statsLoading: true,
            statsError: null,
            showForm: false
        }
    }

    componentDidMount() {
        // Cached sessions render straight away; the refresh button is the only
        // thing that goes back to the API.
        if (!this.state.sessions) {
            this.fetchSessions()
        }
        this.fetchStats()
    }

    fetchStats = async () => {
        this.setState({ statsLoading: true, statsError: null })
        try {
            const stats = await fetchSessionStats()
            this.setState({ stats, statsLoading: false })
        } catch (error) {
            console.error("Error fetching session stats:", error)
            this.setState({ statsError: (error as Error).message, statsLoading: false })
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
        this.fetchStats()
    }

    handleRetry = () => {
        // Keep the loading state on screen long enough to be visible
        this.fetchSessions(1000)
        this.fetchStats()
    }

    formatDays = (value: number | null): string =>
        value === null || value === undefined ? "\u2014" : `${value.toFixed(1)} days`

    // The bar length encodes sessions, the same measure the row is labelled with.
    renderWeekdays = (weekdays: WeekdayStats[]): React.ReactNode => {
        const busiest = Math.max(...weekdays.map(day => day.sessions), 1)

        return weekdays.map((day) => (
            <li key={day.weekday} className="top-list-item">
                <div className="top-list-head">
                    <span className="top-list-name">{day.weekday}</span>
                    <span className="top-list-metric">
                        {this.formatCount(day.sessions)} {day.sessions === 1 ? "session" : "sessions"}
                    </span>
                </div>
                <div className="top-list-bar-track">
                    <div
                        className="top-list-bar"
                        style={{ width: `${(day.sessions / busiest) * 100}%` }}
                    />
                </div>
                <div className="top-list-meta">
                    {this.formatCount(day.sets)} sets · {this.formatWeight(day.volume_kg)}
                </div>
            </li>
        ))
    }

    renderHighlight = (title: string, highlight: SessionHighlight) => (
        <div className="detail-card">
            <h4 className="top-list-title">{title}</h4>
            <button
                className="session-exercise-name"
                onClick={() => this.props.navigate(`/go-heavier/sessions/${highlight.id}`)}
            >
                {this.formatSessionDate(highlight.workout_time)}
            </button>
            <div className="top-list-meta">
                📍 {highlight.location} · {this.formatCount(highlight.sets)} sets ·{" "}
                {this.formatWeight(highlight.volume_kg)}
            </div>
        </div>
    )

    formatCount = (value: number): string => value.toLocaleString()

    formatWeight = (value: number | null): string =>
        value === null || value === undefined ? "\u2014" : `${Math.round(value).toLocaleString()} kg`

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
        const stats = this.state.stats

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

                    {this.state.loaded && (
                        <button
                            className="add-location-button"
                            onClick={() => this.setState({ showForm: true })}
                        >
                            <span className="button-icon">➕</span>
                            Add New Session
                        </button>
                    )}

                    {this.state.showForm && (
                        <SessionForm
                            onClose={() => this.setState({ showForm: false })}
                            onSuccess={(session) => {
                                this.setState({ showForm: false })
                                // The new session is empty, so open it ready for sets.
                                sessionStorage.removeItem(SESSIONS_CACHE_KEY)
                                this.props.navigate(`/go-heavier/sessions/${session.id}`)
                            }}
                        />
                    )}

                    {this.state.loaded && sessions.length === 0 && (
                        <div className="header">
                            <p>No sessions found.</p>
                        </div>
                    )}

                    {this.state.loaded && sessions.length > 0 && (
                        <div className={`sessions-page ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            {this.state.statsLoading && !this.state.stats && (
                                <div className="detail-card">
                                    <p>Loading stats...</p>
                                </div>
                            )}

                            {this.state.statsError && (
                                <div className="detail-card">
                                    <p className="error-message">{this.state.statsError}</p>
                                </div>
                            )}

                            {!this.state.statsError && stats && (
                                <>
                                    <div className="stats-grid">
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{this.formatCount(stats.sessions)}</div>
                                            <div className="stat-tile-label">Sessions</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{stats.average_sets_per_session.toFixed(1)}</div>
                                            <div className="stat-tile-label">Sets / session</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{stats.average_exercises_per_session.toFixed(1)}</div>
                                            <div className="stat-tile-label">Exercises / session</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{this.formatWeight(stats.average_volume_kg_per_session)}</div>
                                            <div className="stat-tile-label">Volume / session</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{this.formatDays(stats.average_days_between_sessions)}</div>
                                            <div className="stat-tile-label">Typical gap</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{this.formatDays(stats.longest_gap_days)}</div>
                                            <div className="stat-tile-label">Longest gap</div>
                                        </div>
                                    </div>

                                    <div className="stats-detail sessions-stats-detail">
                                        {stats.busiest_session && this.renderHighlight("Busiest session", stats.busiest_session)}
                                        {stats.heaviest_session && this.renderHighlight("Heaviest session", stats.heaviest_session)}
                                        {(stats.by_weekday ?? []).length > 0 && (
                                            <div className="detail-card sessions-weekdays">
                                                <h4 className="top-list-title">By day of the week</h4>
                                                <ol className="top-list">
                                                    {this.renderWeekdays(stats.by_weekday ?? [])}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

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
