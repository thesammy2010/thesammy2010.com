import React from "react"
import { useNavigate } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import SessionForm from "../../components/go_heavier/SessionForm"
import { canAccess, isSignedIn, subscribeAccess, subscribeAccessReady } from "../../roles"
import SignInPrompt from "../../components/SignInPrompt"
import { PERMISSION_DENIED_MESSAGE } from "../../configs"
import {
    formatCount,
    formatDays,
    formatShortDate,
    formatTime,
    formatWeight
} from "../../components/go_heavier/format"
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
    loadError: string | null
    sessions?: SessionSummary[]
    isRefreshing: boolean
    stats: SessionStats | null
    statsLoading: boolean
    statsError: string | null
    showForm: boolean
}

export class Sessions extends React.Component<Props, State> {
    unsubscribeAccess?: () => void
    unsubscribeReady?: () => void

    constructor(props: Props) {
        super(props)

        // Guards against a cache written before an error response (e.g. a
        // 403 body) was excluded from what gets cached - an old entry like
        // that would otherwise be trusted as the session list forever,
        // since it's truthy and never re-fetched.
        const cachedData = sessionStorage.getItem(SESSIONS_CACHE_KEY)
        const parsedSessions = cachedData ? JSON.parse(cachedData) : undefined
        const cachedSessions = Array.isArray(parsedSessions) ? parsedSessions : undefined

        this.state = {
            loaded: cachedSessions ? true : null,
            loadError: null,
            sessions: cachedSessions,
            isRefreshing: false,
            stats: null,
            statsLoading: true,
            statsError: null,
            showForm: false
        }
    }

    // Only skip the very first, automatic load - the refresh/retry buttons
    // call fetchSessions/fetchStats directly and always hit the API, since
    // clicking one is an explicit request that's worth trying even if we
    // think it'll fail. Gated independently since they're separate calls
    // with separate error states.
    autoFetchSessions = () => {
        // Checked before the cache: an empty (but validly cached) list looks
        // exactly like "already loaded, nothing to show" and would otherwise
        // keep being trusted after a role change revoked access, silently
        // masking the permission problem behind "No sessions found."
        if (!canAccess("GET", "/go-heavier/sessions")) {
            this.setState({ loaded: false, loadError: PERMISSION_DENIED_MESSAGE })
            return
        }
        // Cached sessions render straight away; the refresh button is the
        // only thing that goes back to the API.
        if (this.state.sessions) {
            return
        }
        this.fetchSessions()
    }

    autoFetchStats = () => {
        if (!canAccess("GET", "/go-heavier/sessions/stats")) {
            this.setState({ statsLoading: false, statsError: PERMISSION_DENIED_MESSAGE })
            return
        }
        this.fetchStats()
    }

    componentDidMount() {
        this.unsubscribeAccess = subscribeAccess(() => this.forceUpdate())
        this.unsubscribeReady = subscribeAccessReady(() => {
            this.autoFetchSessions()
            this.autoFetchStats()
        })
    }

    componentWillUnmount() {
        this.unsubscribeAccess?.()
        this.unsubscribeReady?.()
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
            this.setState({ sessions, loaded: true, loadError: null, isRefreshing: false })
        } catch (error) {
            console.error("Error fetching sessions:", error)
            await waitOut()
            this.setState({ loaded: false, loadError: (error as Error).message, isRefreshing: false })
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

    renderWeekdays = (weekdays: WeekdayStats[]): React.ReactNode => {
        const busiest = Math.max(...weekdays.map(day => day.sessions), 1)

        return weekdays.map((day) => (
            <li key={day.weekday} className="top-list-item">
                <div className="top-list-head">
                    <span className="top-list-name">{day.weekday}</span>
                    <span className="top-list-metric">
                        {formatCount(day.sessions)} {day.sessions === 1 ? "session" : "sessions"}
                    </span>
                </div>
                <div className="top-list-bar-track">
                    <div
                        className="top-list-bar"
                        style={{ width: `${(day.sessions / busiest) * 100}%` }}
                    />
                </div>
                <div className="top-list-meta">
                    {formatCount(day.sets)} sets · {formatWeight(day.volume_kg)}
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
                {formatShortDate(highlight.workout_time)}
            </button>
            <div className="top-list-meta">
                📍 {highlight.location} · {formatCount(highlight.sets)} sets ·{" "}
                {formatWeight(highlight.volume_kg)}
            </div>
        </div>
    )

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

                    {this.state.loaded === false && !isSignedIn() && (
                        <SignInPrompt message="Sign in to view sessions." />
                    )}
                    {this.state.loaded === false && isSignedIn() && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Sessions</h2>
                            <p className="error-message">
                                {this.state.loadError ?? "Unable to fetch sessions from server"}
                            </p>
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

                    {this.state.loaded && canAccess("POST", "/go-heavier/sessions") && (
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
                                            <div className="stat-tile-value">{formatCount(stats.sessions)}</div>
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
                                            <div className="stat-tile-value">{formatWeight(stats.average_volume_kg_per_session)}</div>
                                            <div className="stat-tile-label">Volume / session</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{formatDays(stats.average_days_between_sessions)}</div>
                                            <div className="stat-tile-label">Typical gap</div>
                                        </div>
                                        <div className="stat-tile">
                                            <div className="stat-tile-value">{formatDays(stats.longest_gap_days)}</div>
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
                                                    {formatShortDate(session.workout_time)}
                                                </span>
                                                <span className="session-time">
                                                    {formatTime(session.workout_time)}
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
                                                <span className="session-metric-value">{formatCount(session.repetitions)}</span>
                                                <span className="session-metric-label">Reps</span>
                                            </div>
                                            <div className="session-metric">
                                                <span className="session-metric-value">{formatWeight(session.volume_kg)}</span>
                                                <span className="session-metric-label">Volume</span>
                                            </div>
                                            <div className="session-metric">
                                                <span className="session-metric-value">{formatWeight(session.heaviest_weight_kg)}</span>
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
