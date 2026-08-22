import React from "react"
import { Link } from "react-router-dom"

import { API_URL } from "../configs"
import GoHeavierNavBar from "../components/go_heavier/NavBar"
import "./GoHeavier.css"

interface ConfigData {
    default: {
        IsoCountryCode: string[]
    }
    "go-heavier": {
        MuscleGroup: string[]
        SpecificMuscle: string[]
    }
}

interface State {
    configLoaded: boolean | null
    config: ConfigData | null
    isRefreshing: boolean
    locationCount?: number
    exerciseCount?: number
    workoutCount?: number
}

export default class GoHeavier extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props)
        this.state = {
            configLoaded: null,
            config: null,
            isRefreshing: false,
            locationCount: undefined,
            exerciseCount: undefined,
            workoutCount: undefined
        }
    }

    fetchConfig = async (minDuration: number = 300) => {
        const startedAt = Date.now()
        const waitOut = () => new Promise<void>(resolve =>
            setTimeout(resolve, Math.max(0, minDuration - (Date.now() - startedAt)))
        )

        this.setState({ isRefreshing: true })
        try {
            // Get workout count from cache
            const cachedWorkouts = localStorage.getItem('go-heavier-workouts')
            const workoutCount = cachedWorkouts ? JSON.parse(cachedWorkouts).length : 0
            
            const [configRes, locationsRes, exercisesRes] = await Promise.all([
                fetch(`${API_URL}/config`),
                fetch(`${API_URL}/go-heavier/locations`),
                fetch(`${API_URL}/go-heavier/exercises`)
            ])
            
            const config = await configRes.json()
            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()
            
            await waitOut()
            this.setState({ 
                config, 
                configLoaded: true, 
                isRefreshing: false,
                locationCount: locations.length,
                exerciseCount: exercises.length,
                workoutCount: workoutCount
            })
        } catch (error) {
            console.error("Error fetching config:", error)
            await waitOut()
            this.setState({ configLoaded: false, isRefreshing: false })
        }
    }

    componentDidMount() {
        this.fetchConfig()
    }

    handleRefresh = () => {
        this.fetchConfig()
    }

    handleRetry = () => {
        // Keep the loading state on screen long enough to be visible
        this.fetchConfig(1000)
    }

    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    {this.state.configLoaded && !this.state.isRefreshing && (
                        <button 
                            onClick={this.handleRefresh} 
                            className={`refresh-arrow-button ${this.state.isRefreshing ? 'spinning' : ''}`}
                            title="Refresh"
                        >
                            ↻
                        </button>
                    )}

                    {this.state.configLoaded === null && (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    )}

                    {this.state.configLoaded === false && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Configuration</h2>
                            <p className="error-message">Unable to fetch config from server</p>
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

                    {this.state.configLoaded && this.state.config && (
                        <div className={`go-heavier-dashboard ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="dashboard-hero">
                                <h1>💪 Go Heavier Dashboard</h1>
                                <p>System Configuration & Metadata</p>
                            </div>

                            <div className="stats-overview">
                                <Link to="/go-heavier/locations" className="stat-card">
                                    <div className="stat-icon">📍</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{this.state.locationCount ?? '...'}</div>
                                        <div className="stat-label">Locations</div>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/exercises" className="stat-card">
                                    <div className="stat-icon">🏋️</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{this.state.exerciseCount ?? '...'}</div>
                                        <div className="stat-label">Exercises</div>
                                    </div>
                                </Link>
                                <Link to="/go-heavier/workouts" className="stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{this.state.workoutCount ?? '...'}</div>
                                        <div className="stat-label">Workouts</div>
                                    </div>
                                </Link>
                            </div>

                            <div className="config-grid">
                                <div className="config-card">
                                    <div className="config-card-header">
                                        <h2>🌍 Countries</h2>
                                        <span className="count-badge">{this.state.config.default.IsoCountryCode.length}</span>
                                    </div>
                                    <p className="config-description">
                                        ISO 3166-1 alpha-3 country codes supported by the system
                                    </p>
                                    <div className="tag-container">
                                        {this.state.config.default.IsoCountryCode.slice(0, 20).map((country, index) => (
                                            <span key={index} className="tag tag-country">{country}</span>
                                        ))}
                                        {this.state.config.default.IsoCountryCode.length > 20 && (
                                            <span className="tag tag-more">
                                                +{this.state.config.default.IsoCountryCode.length - 20} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="config-card">
                                    <div className="config-card-header">
                                        <h2>💪 Muscle Groups</h2>
                                        <span className="count-badge">{this.state.config["go-heavier"].MuscleGroup.length}</span>
                                    </div>
                                    <p className="config-description">
                                        Primary muscle groups available for exercise categorization
                                    </p>
                                    <div className="tag-container">
                                        {this.state.config["go-heavier"].MuscleGroup.map((group, index) => (
                                            <span key={index} className="tag tag-muscle">{group}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="config-card">
                                    <div className="config-card-header">
                                        <h2>🎯 Specific Muscles</h2>
                                        <span className="count-badge">{this.state.config["go-heavier"].SpecificMuscle.length}</span>
                                    </div>
                                    <p className="config-description">
                                        Detailed muscle targets for precise exercise classification
                                    </p>
                                    <div className="tag-container">
                                        {this.state.config["go-heavier"].SpecificMuscle.map((muscle, index) => (
                                            <span key={index} className="tag tag-specific">{muscle}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="dashboard-footer">
                                <p>Configuration loaded from API • Last refreshed: {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}
