import React from "react"
import { Link } from "react-router-dom"

import { API_URL, WORKOUTS_CACHE_KEY } from "../configs"
import GoHeavierNavBar from "../components/go_heavier/NavBar"
import "./GoHeavier.css"

interface State {
    loaded: boolean | null
    isRefreshing: boolean
    locationCount?: number
    exerciseCount?: number
    workoutCount?: number
}

export default class GoHeavier extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props)
        this.state = {
            loaded: null,
            isRefreshing: false,
            locationCount: undefined,
            exerciseCount: undefined,
            workoutCount: undefined
        }
    }

    fetchCounts = async (minDuration: number = 300) => {
        const startedAt = Date.now()
        const waitOut = () => new Promise<void>(resolve =>
            setTimeout(resolve, Math.max(0, minDuration - (Date.now() - startedAt)))
        )

        this.setState({ isRefreshing: true })
        try {
            // Workouts are paged, so the count comes from what the workouts page cached.
            const cachedWorkouts = localStorage.getItem(WORKOUTS_CACHE_KEY)
            const workoutCount = cachedWorkouts ? JSON.parse(cachedWorkouts).length : undefined

            const [locationsRes, exercisesRes] = await Promise.all([
                fetch(`${API_URL}/go-heavier/locations`),
                fetch(`${API_URL}/go-heavier/exercises`)
            ])

            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()

            await waitOut()
            this.setState({
                loaded: true,
                isRefreshing: false,
                locationCount: locations.length,
                exerciseCount: exercises.length,
                workoutCount: workoutCount
            })
        } catch (error) {
            console.error("Error fetching dashboard counts:", error)
            await waitOut()
            this.setState({ loaded: false, isRefreshing: false })
        }
    }

    componentDidMount() {
        this.fetchCounts()
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

                    {this.state.loaded === false && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Dashboard</h2>
                            <p className="error-message">Unable to fetch data from server</p>
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

                            <div className="stats-overview">
                                <Link to="/go-heavier/locations" className="stat-card">
                                    <div className="stat-icon">📍</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{this.state.locationCount ?? '...'}</div>
                                        <div className="stat-label">Locations</div>
                                        <p className="stat-caption">The gyms you train at</p>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/exercises" className="stat-card">
                                    <div className="stat-icon">🏋️</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{this.state.exerciseCount ?? '...'}</div>
                                        <div className="stat-label">Exercises</div>
                                        <p className="stat-caption">Movements in your library</p>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/workouts" className="stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{this.state.workoutCount ?? '...'}</div>
                                        <div className="stat-label">Workouts</div>
                                        <p className="stat-caption">Sets you have logged</p>
                                    </div>
                                </Link>
                            </div>

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
