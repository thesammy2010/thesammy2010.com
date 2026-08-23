import React from "react"
import { useNavigate, useParams } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import { API_URL, formatNotes } from "../../configs"
import "../GoHeavier.css"
import "../../components/go_heavier/Stats.css"
import "./Sessions.css"
import "./LocationDetail.css"

interface SessionExerciseStats {
    exercise_id: string
    name: string
    sets: number
    repetitions: number
    volume_kg: number
    heaviest_weight_kg: number
}

interface SessionData {
    id: string
    workout_time: string
    location_id: string
    location: string
    sets: number
    exercises: number
    repetitions: number
    volume_kg: number
    heaviest_weight_kg: number
    by_exercise?: SessionExerciseStats[]
}

interface WorkoutSet {
    id: string
    session_id: string
    exercise_id: string
    index: number
    repetitions: number
    weight_kg: number
    bar_weight_kg: number | null
    supplementary_weight_kg: number | null
    notes: string | null
}

interface Props {
    id: string
    navigate: (path: string) => void
}

interface State {
    session: SessionData | null
    loading: boolean
    error: string | null
    isRefreshing: boolean
    sets: WorkoutSet[] | null
    setsLoading: boolean
    setsError: string | null
}

class SessionDetailClass extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            session: null,
            loading: true,
            error: null,
            isRefreshing: false,
            sets: null,
            setsLoading: true,
            setsError: null
        }
    }

    componentDidMount() {
        this.fetchSession()
        this.fetchSets()
    }

    fetchSession = async () => {
        this.setState({ loading: true, error: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/sessions/${this.props.id}`)
            if (!response.ok) {
                throw new Error("Session not found")
            }
            const session = await response.json()
            this.setState({ session, loading: false })
        } catch (error) {
            console.error("Error fetching session:", error)
            this.setState({ error: (error as Error).message, loading: false })
        }
    }

    fetchSets = async () => {
        this.setState({ setsLoading: true, setsError: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/workouts?session_id=${this.props.id}`)
            if (!response.ok) {
                throw new Error("Failed to load the sets in this session")
            }
            const sets: WorkoutSet[] = await response.json()
            this.setState({ sets, setsLoading: false })
        } catch (error) {
            console.error("Error fetching sets:", error)
            this.setState({ setsError: (error as Error).message, setsLoading: false })
        }
    }

    handleRefresh = () => {
        this.setState({ isRefreshing: true })
        Promise.all([this.fetchSession(), this.fetchSets()]).finally(() => {
            this.setState({ isRefreshing: false })
        })
    }

    handleBack = () => {
        this.props.navigate("/go-heavier/sessions")
    }

    formatCount = (value: number): string => value.toLocaleString()

    formatWeight = (value: number | null): string =>
        value === null || value === undefined ? "—" : `${Math.round(value).toLocaleString()} kg`

    formatSessionDate = (value: string): string =>
        new Date(value).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })

    // The sets come back in exercise order; group them so each exercise reads as a block.
    groupSetsByExercise = (): Array<{ exercise: SessionExerciseStats; sets: WorkoutSet[] }> => {
        const byExercise = this.state.session?.by_exercise ?? []
        const sets = this.state.sets ?? []

        return byExercise.map(exercise => ({
            exercise,
            sets: sets
                .filter(set => set.exercise_id === exercise.exercise_id)
                .sort((a, b) => a.index - b.index)
        }))
    }

    render(): React.ReactNode {
        const session = this.state.session
        const grouped = this.groupSetsByExercise()

        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    <button className="back-button" onClick={this.handleBack}>
                        ← Back to Sessions
                    </button>

                    {!this.state.loading && !this.state.error && (
                        <button
                            onClick={this.handleRefresh}
                            className={`refresh-arrow-button ${this.state.isRefreshing ? 'spinning' : ''}`}
                            title="Refresh"
                            disabled={this.state.isRefreshing}
                        >
                            ↻
                        </button>
                    )}

                    {this.state.loading && (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    )}

                    {this.state.error && (
                        <div className="error-container">
                            <h2>Error</h2>
                            <p className="error-message">{this.state.error}</p>
                            <button onClick={this.handleBack}>Go Back</button>
                        </div>
                    )}

                    {session && (
                        <div className={`location-detail-container ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="location-detail-header">
                                <h1>{this.formatSessionDate(session.workout_time)}</h1>
                                <p className="location-detail-description">
                                    <button
                                        className="session-location-link"
                                        onClick={() => this.props.navigate(`/go-heavier/locations/${session.location_id}`)}
                                    >
                                        📍 {session.location}
                                    </button>
                                </p>
                            </div>

                            <div className="detail-section stats-section">
                                <h3>📊 Session Totals</h3>
                                <div className="stats-grid">
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{session.exercises}</div>
                                        <div className="stat-tile-label">Exercises</div>
                                    </div>
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{session.sets}</div>
                                        <div className="stat-tile-label">Sets</div>
                                    </div>
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{this.formatCount(session.repetitions)}</div>
                                        <div className="stat-tile-label">Reps</div>
                                    </div>
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{this.formatWeight(session.volume_kg)}</div>
                                        <div className="stat-tile-label">Volume</div>
                                    </div>
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{this.formatWeight(session.heaviest_weight_kg)}</div>
                                        <div className="stat-tile-label">Heaviest</div>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section stats-section">
                                <h3>🏋️ Exercises</h3>

                                {this.state.setsLoading && (
                                    <div className="detail-card">
                                        <p>Loading sets...</p>
                                    </div>
                                )}

                                {this.state.setsError && (
                                    <div className="detail-card">
                                        <p className="error-message">{this.state.setsError}</p>
                                    </div>
                                )}

                                {!this.state.setsLoading && !this.state.setsError && grouped.length === 0 && (
                                    <div className="detail-card">
                                        <p>No sets recorded in this session.</p>
                                    </div>
                                )}

                                {!this.state.setsLoading && !this.state.setsError && grouped.map(({ exercise, sets }) => (
                                    <div key={exercise.exercise_id} className="detail-card session-exercise">
                                        <div className="session-exercise-head">
                                            <button
                                                className="session-exercise-name"
                                                onClick={() => this.props.navigate(`/go-heavier/exercises/${exercise.exercise_id}`)}
                                            >
                                                {exercise.name}
                                            </button>
                                            <span className="session-exercise-summary">
                                                {exercise.sets} sets · {this.formatCount(exercise.repetitions)} reps ·{" "}
                                                {this.formatWeight(exercise.volume_kg)} · top {this.formatWeight(exercise.heaviest_weight_kg)}
                                            </span>
                                        </div>

                                        <div className="set-table-wrapper">
                                            <table className="set-table">
                                                <thead>
                                                    <tr>
                                                        <th>Set</th>
                                                        <th>Reps</th>
                                                        <th>Weight</th>
                                                        <th>Bar</th>
                                                        <th>Supp.</th>
                                                        <th>Total</th>
                                                        <th>Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sets.map((set) => {
                                                        const total = set.weight_kg +
                                                            (set.bar_weight_kg || 0) +
                                                            (set.supplementary_weight_kg || 0)
                                                        return (
                                                            <tr key={set.id}>
                                                                <td>{set.index}</td>
                                                                <td>{set.repetitions}</td>
                                                                <td>{set.weight_kg.toFixed(1)}</td>
                                                                <td>{set.bar_weight_kg ? set.bar_weight_kg.toFixed(1) : "-"}</td>
                                                                <td>{set.supplementary_weight_kg ? set.supplementary_weight_kg.toFixed(1) : "-"}</td>
                                                                <td><strong>{total.toFixed(1)}</strong></td>
                                                                <td className="set-notes">{formatNotes(set.notes)}</td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
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
export default function SessionDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    return <SessionDetailClass id={id!} navigate={navigate} />
}
