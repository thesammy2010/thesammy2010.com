import React from "react"
import { Link, useNavigate } from "react-router-dom"

import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../configs"
import { apiFetch } from "../auth"
import { canAccess, isSignedIn, subscribeAccess, subscribeAccessReady } from "../roles"
import { fetchAllSessions } from "../components/go_heavier/sessions"
import { formatCount, formatTonnes } from "../components/go_heavier/format"
import GoHeavierNavBar from "../components/go_heavier/NavBar"
import LogWorkoutWizard from "../components/go_heavier/LogWorkoutWizard"
import SignInPrompt from "../components/SignInPrompt"
import "./GoHeavier.css"

interface Props {
    navigate: (path: string) => void
}

interface State {
    showWizard: boolean
    loaded: boolean | null
    loadError: string | null
    isRefreshing: boolean
    locationCount?: number
    exerciseCount?: number
    sessionCount?: number
    workoutCount?: number
    totalVolumeKg?: number
}

export class GoHeavier extends React.Component<Props, State> {
    unsubscribeAccess?: () => void
    unsubscribeReady?: () => void

    constructor(props: Props) {
        super(props)
        this.state = {
            showWizard: false,
            loaded: null,
            loadError: null,
            isRefreshing: false,
            locationCount: undefined,
            exerciseCount: undefined,
            sessionCount: undefined,
            workoutCount: undefined,
            totalVolumeKg: undefined
        }
    }

    fetchCounts = async (minDuration: number = 300) => {
        const startedAt = Date.now()
        const waitOut = () => new Promise<void>(resolve =>
            setTimeout(resolve, Math.max(0, minDuration - (Date.now() - startedAt)))
        )

        this.setState({ isRefreshing: true })
        try {
            const [sessions, locationsRes, exercisesRes] = await Promise.all([
                fetchAllSessions(),
                apiFetch(`${API_URL}/go-heavier/locations`),
                apiFetch(`${API_URL}/go-heavier/exercises`)
            ])

            if (!locationsRes.ok) {
                throw new ApiError(locationsRes.status, "Failed to load locations")
            }
            if (!exercisesRes.ok) {
                throw new ApiError(exercisesRes.status, "Failed to load exercises")
            }

            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()

            // Every set belongs to a session, so the sessions carry the totals.
            const workoutCount = sessions.reduce((total, session) => total + session.sets, 0)
            const totalVolumeKg = sessions.reduce((total, session) => total + session.volume_kg, 0)

            await waitOut()
            this.setState({
                loaded: true,
                loadError: null,
                isRefreshing: false,
                locationCount: locations.length,
                exerciseCount: exercises.length,
                sessionCount: sessions.length,
                workoutCount: workoutCount,
                totalVolumeKg: totalVolumeKg
            })
        } catch (error) {
            console.error("Error fetching dashboard counts:", error)
            await waitOut()
            this.setState({ loaded: false, loadError: (error as Error).message, isRefreshing: false })
        }
    }

    // Only skips the very first, automatic load - the refresh/retry buttons
    // call fetchCounts directly and always hit the API, since clicking one
    // is an explicit request that's worth trying even if we think it'll
    // fail. All three underlying requests are needed for this page, so it's
    // an all-or-nothing check.
    autoFetch = () => {
        const canAccessAll =
            canAccess("GET", "/go-heavier/sessions") &&
            canAccess("GET", "/go-heavier/locations") &&
            canAccess("GET", "/go-heavier/exercises")
        if (!canAccessAll) {
            this.setState({ loaded: false, loadError: PERMISSION_DENIED_MESSAGE })
            return
        }
        this.fetchCounts()
    }

    componentDidMount() {
        // Not just a re-render: signing in (or an admin changing your role)
        // fires this too, and without retrying autoFetch here, someone who
        // signs in from the "sign in to continue" prompt on this exact page
        // would see nothing happen - the one-time subscribeAccessReady
        // callback already fired, showing that prompt, before they signed in.
        this.unsubscribeAccess = subscribeAccess(() => {
            this.forceUpdate()
            if (!this.state.loaded) {
                this.autoFetch()
            }
        })
        this.unsubscribeReady = subscribeAccessReady(this.autoFetch)
    }

    componentWillUnmount() {
        this.unsubscribeAccess?.()
        this.unsubscribeReady?.()
    }

    handleRefresh = () => {
        this.fetchCounts()
    }

    handleRetry = () => {
        // Keep the loading state on screen long enough to be visible
        this.fetchCounts(1000)
    }

    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    {this.state.loaded && !this.state.isRefreshing && (
                        <button
                            onClick={this.handleRefresh}
                            className={`refresh-arrow-button ${this.state.isRefreshing ? 'spinning' : ''}`}
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
                        <SignInPrompt message="Sign in to view your Go Heavier dashboard." />
                    )}

                    {this.state.loaded === false && isSignedIn() && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Dashboard</h2>
                            <p className="error-message">
                                {this.state.loadError ?? "Unable to fetch data from server"}
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

                    {this.state.loaded && (
                        <div className={`go-heavier-dashboard ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="dashboard-hero">
                                <h1>💪 Go Heavier</h1>
                                <p className="dashboard-tagline">
                                    A training log for the gym. Keep track of where you train, the
                                    exercises you do, and every set you lift — then watch the numbers
                                    climb.
                                </p>
                            </div>

                            {canAccess("POST", "/go-heavier/sessions") && canAccess("POST", "/go-heavier/workouts") && (
                                <button
                                    className="log-workout-button"
                                    onClick={() => this.setState({ showWizard: true })}
                                >
                                    <span className="button-icon">🏋️</span>
                                    Log a workout
                                </button>
                            )}

                            <div className="stats-overview">
                                <Link to="/go-heavier/locations" className="stat-card">
                                    <div className="stat-icon">📍</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCount(this.state.locationCount)}</div>
                                        <div className="stat-label">Locations</div>
                                        <p className="stat-caption">The gyms you train at</p>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/exercises" className="stat-card">
                                    <div className="stat-icon">🏋️</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCount(this.state.exerciseCount)}</div>
                                        <div className="stat-label">Exercises</div>
                                        <p className="stat-caption">Movements in your library</p>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/sessions" className="stat-card">
                                    <div className="stat-icon">🗓️</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCount(this.state.sessionCount)}</div>
                                        <div className="stat-label">Sessions</div>
                                        <p className="stat-caption">Visits to the gym</p>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/workouts" className="stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCount(this.state.workoutCount)}</div>
                                        <div className="stat-label">Workouts</div>
                                        <p className="stat-caption">Sets you have logged</p>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/stats" className="stat-card">
                                    <div className="stat-icon">📈</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatTonnes(this.state.totalVolumeKg)}</div>
                                        <div className="stat-label">Stats</div>
                                        <p className="stat-caption">Total weight moved, charted over time</p>
                                    </div>
                                </Link>
                            </div>

                            {this.state.showWizard && (
                                <LogWorkoutWizard
                                    onClose={() => this.setState({ showWizard: false })}
                                    onSaved={(sessionId) => {
                                        this.setState({ showWizard: false })
                                        this.props.navigate(`/go-heavier/sessions/${sessionId}`)
                                    }}
                                />
                            )}

                            <div className="dashboard-footer">
                                <p>Last refreshed: {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

// Wrapper component to use React Router hooks
export default function GoHeavierWithNavigate() {
    const navigate = useNavigate()
    return <GoHeavier navigate={navigate} />
}
