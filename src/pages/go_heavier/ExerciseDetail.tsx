import React from "react"
import { useParams, useNavigate } from "react-router-dom"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import { API_URL, formatNotes } from "../../configs"
import { formatCount, formatFullDate, formatLongDate, formatWeight } from "../../components/go_heavier/format"
import { SessionSummary, fetchAllSessions, indexSessions } from "../../components/go_heavier/sessions"
import "../../components/go_heavier/Stats.css"
import "./ExerciseDetail.css"
import "../go_heavier/Exercises.css"
import "../../components/go_heavier/ExerciseForm.css"

interface ExerciseData {
    id: string
    name: string
    description: string
    muscle_group: string
    specific_muscle: string
    bipedal: boolean
    free_weights: boolean
    image_url: string
    created_at: string
    updated_at: string
}

// Guard on the page walk so a misbehaving endpoint can't loop forever.
const MAX_WORKOUT_PAGES = 500

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

interface TopLocation {
    location_id: string
    name: string
    sessions: number
    sets: number
    repetitions: number
    volume_kg: number
}

interface ExerciseStatsData {
    exercise_id: string
    name: string
    sessions: number
    first_performed: string | null
    last_performed: string | null
    total_sets: number
    total_repetitions: number
    total_volume_kg: number
    heaviest_weight_kg: number | null
    average_sets_per_session: number
    average_repetitions_per_set: number
    distinct_locations: number
    top_locations?: TopLocation[]
}

interface State {
    exercise: ExerciseData | null
    stats: ExerciseStatsData | null
    statsLoading: boolean
    statsError: string | null
    exerciseSets: WorkoutSet[] | null
    setsLoading: boolean
    setsError: string | null
    sessions: SessionSummary[]
    sessionsById: Record<string, SessionSummary>
    loading: boolean
    error: string | null
    isRefreshing: boolean
    isEditing: boolean
    showDeleteConfirm: boolean
    formData: {
        name: string
        description: string
        muscle_group: string
        specific_muscle: string
        bipedal: boolean
        free_weights: boolean
        image_url: string
    }
    formLoading: boolean
    formError: string | null
}

class ExerciseDetailClass extends React.Component<{ id: string; navigate: any }, State> {
    constructor(props: { id: string; navigate: any }) {
        super(props)
        this.state = {
            exercise: null,
            stats: null,
            statsLoading: true,
            statsError: null,
            exerciseSets: null,
            setsLoading: true,
            setsError: null,
            sessions: [],
            sessionsById: {},
            loading: true,
            error: null,
            isRefreshing: false,
            isEditing: false,
            showDeleteConfirm: false,
            formData: {
                name: "",
                description: "",
                muscle_group: "",
                specific_muscle: "",
                bipedal: false,
                free_weights: false,
                image_url: ""
            },
            formLoading: false,
            formError: null
        }
    }

    componentDidMount() {
        this.fetchExercise()
        this.fetchStats()
        this.fetchExerciseSets()
    }

    // Sets for this exercise, plus the sessions they belong to — a set carries
    // neither a time nor a location any more, the session does.
    fetchExerciseSets = async () => {
        this.setState({ setsLoading: true, setsError: null })
        try {
            const [exerciseSets, sessions] = await Promise.all([
                this.fetchAllSets(),
                fetchAllSessions(this.props.id)
            ])

            this.setState({
                exerciseSets,
                sessions,
                sessionsById: indexSessions(sessions),
                setsLoading: false
            })
        } catch (error) {
            console.error("Error fetching workouts for this exercise:", error)
            this.setState({ setsError: (error as Error).message, setsLoading: false })
        }
    }

    fetchAllSets = async (): Promise<WorkoutSet[]> => {
        const sets: WorkoutSet[] = []

        for (let page = 1; page <= MAX_WORKOUT_PAGES; page++) {
            const params = new URLSearchParams({
                exercise_id: this.props.id,
                page: String(page)
            })
            const response = await fetch(`${API_URL}/go-heavier/workouts?${params}`)
            if (!response.ok) {
                throw new Error("Failed to load workouts")
            }

            const pageSets: WorkoutSet[] = await response.json()
            if (pageSets.length === 0) {
                break
            }
            sets.push(...pageSets)
        }

        return sets
    }


    fetchStats = async () => {
        this.setState({ statsLoading: true, statsError: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/exercises/${this.props.id}/stats`)
            if (!response.ok) {
                throw new Error("Failed to load stats")
            }
            const stats = await response.json()
            this.setState({ stats, statsLoading: false })
        } catch (error) {
            console.error("Error fetching exercise stats:", error)
            this.setState({ statsError: (error as Error).message, statsLoading: false })
        }
    }

    fetchExercise = async () => {
        this.setState({ loading: true, error: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/exercises/${this.props.id}`)
            if (!response.ok) {
                throw new Error("Exercise not found")
            }
            const result = await response.json()
            this.setState({ 
                exercise: result, 
                loading: false,
                formData: {
                    name: result.name,
                    description: result.description || "",
                    muscle_group: result.muscle_group || "",
                    specific_muscle: result.specific_muscle || "",
                    bipedal: result.bipedal,
                    free_weights: result.free_weights,
                    image_url: result.image_url || ""
                }
            })
        } catch (error) {
            console.error("Error fetching exercise:", error)
            this.setState({ error: (error as Error).message, loading: false })
        }
    }

    handleRefresh = async () => {
        this.setState({ isRefreshing: true })
        this.fetchStats()
        this.fetchExerciseSets()
        try {
            const response = await fetch(`${API_URL}/go-heavier/exercises/${this.props.id}`)
            if (!response.ok) {
                throw new Error("Exercise not found")
            }
            const result = await response.json()
            setTimeout(() => {
                this.setState({ exercise: result, isRefreshing: false })
            }, 300)
        } catch (error) {
            console.error("Error fetching exercise:", error)
            this.setState({ error: (error as Error).message, isRefreshing: false })
        }
    }

    handleBack = () => {
        this.props.navigate("/go-heavier/exercises")
    }

    handleDelete = () => {
        this.setState({ showDeleteConfirm: true })
    }

    handleCancelDelete = () => {
        this.setState({ showDeleteConfirm: false })
    }

    handleConfirmDelete = async () => {
        if (!this.state.exercise) return

        try {
            await fetch(`${API_URL}/go-heavier/exercises/${this.props.id}`, {
                method: "DELETE"
            })
            sessionStorage.removeItem('go-heavier-exercises')
            this.props.navigate("/go-heavier/exercises")
        } catch (error) {
            console.error("Error deleting exercise:", error)
            this.setState({ showDeleteConfirm: false })
            alert("Failed to delete exercise")
        }
    }

    handleEdit = () => {
        this.setState({ isEditing: true })
    }

    handleCancelEdit = () => {
        if (!this.state.exercise) return
        
        this.setState({
            isEditing: false,
            formData: {
                name: this.state.exercise.name,
                description: this.state.exercise.description || "",
                muscle_group: this.state.exercise.muscle_group || "",
                specific_muscle: this.state.exercise.specific_muscle || "",
                bipedal: this.state.exercise.bipedal,
                free_weights: this.state.exercise.free_weights,
                image_url: this.state.exercise.image_url || ""
            },
            formError: null
        })
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked
            this.setState((prevState) => ({
                formData: { ...prevState.formData, [name]: checked }
            }))
        } else {
            this.setState((prevState) => ({
                formData: { ...prevState.formData, [name]: value }
            }))
        }
    }

    validateForm = (): boolean => {
        const { name } = this.state.formData

        if (!name.trim()) {
            this.setState({ formError: "Name is required" })
            return false
        }

        return true
    }

    handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ formError: null })

        if (!this.validateForm()) {
            return
        }

        this.setState({ formLoading: true })

        try {
            const response = await fetch(`${API_URL}/go-heavier/exercises/${this.props.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.formData)
            })

            if (!response.ok) {
                throw new Error("Failed to update exercise")
            }

            const result = await response.json()
            
            sessionStorage.removeItem('go-heavier-exercises')
            this.setState({ 
                exercise: result,
                isEditing: false,
                formLoading: false
            })
        } catch (err) {
            this.setState({ formError: (err as Error).message, formLoading: false })
        }
    }

    getLatestSession = (): SessionSummary | null => {
        const sessions = this.state.sessions
        if (sessions.length === 0) {
            return null
        }

        return sessions.reduce((latest, session) =>
            new Date(session.workout_time) > new Date(latest.workout_time) ? session : latest
        )
    }

    // Every set of this exercise logged in that session.
    getLatestSets = (): WorkoutSet[] => {
        const latest = this.getLatestSession()
        if (!latest) {
            return []
        }

        return (this.state.exerciseSets ?? [])
            .filter(set => set.session_id === latest.id)
            .sort((a, b) => a.index - b.index)
    }

    // Heaviest set, the same measure as the "Heaviest lift" stat. Ties go to the
    // set with the most repetitions, then to the most recent one.
    getBestSet = (): WorkoutSet | null => {
        const sets = this.state.exerciseSets ?? []
        if (sets.length === 0) {
            return null
        }

        return sets.reduce((best, set) => {
            if (set.weight_kg !== best.weight_kg) {
                return set.weight_kg > best.weight_kg ? set : best
            }
            if (set.repetitions !== best.repetitions) {
                return set.repetitions > best.repetitions ? set : best
            }
            const setTime = this.state.sessionsById[set.session_id]?.workout_time
            const bestTime = this.state.sessionsById[best.session_id]?.workout_time
            if (!setTime || !bestTime) {
                return best
            }
            return new Date(setTime) > new Date(bestTime) ? set : best
        })
    }

    renderTopLocations = (topLocations: TopLocation[]): React.ReactNode => {
        const mostSessions = Math.max(...topLocations.map(location => location.sessions), 1)

        return topLocations.map((location) => (
            <li key={location.location_id} className="top-list-item">
                <div className="top-list-head">
                    <a
                        className="top-list-name"
                        href={`/go-heavier/locations/${location.location_id}`}
                        onClick={(e) => {
                            e.preventDefault()
                            this.props.navigate(`/go-heavier/locations/${location.location_id}`)
                        }}
                    >
                        {location.name}
                    </a>
                    <span className="top-list-metric">
                        {formatCount(location.sessions)} sessions
                    </span>
                </div>
                <div className="top-list-bar-track">
                    <div
                        className="top-list-bar"
                        style={{ width: `${(location.sessions / mostSessions) * 100}%` }}
                    />
                </div>
                <div className="top-list-meta">
                    {formatCount(location.sets)} sets · {formatCount(location.repetitions)} reps · {formatWeight(location.volume_kg)}
                </div>
            </li>
        ))
    }

    render(): React.ReactNode {
        const latestSession = this.getLatestSession()
        const latestSets = this.getLatestSets()
        const bestSet = this.getBestSet()
        const bestSetSession = bestSet ? this.state.sessionsById[bestSet.session_id] : undefined

        if (this.state.showDeleteConfirm) {
            return (
                <div className="center-container-grid">
                    <GoHeavierNavBar />
                    <div className="page-container">
                        <div className="popup-overlay" onClick={this.handleCancelDelete}>
                            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                                <div className="confirm-header">
                                    <h2>💪 Go Heavier</h2>
                                </div>
                                <div className="confirm-content">
                                    <h3>Delete Exercise?</h3>
                                    <p>Are you sure you want to delete <strong>"{this.state.exercise?.name}"</strong>?</p>
                                    <p className="warning-text">This action cannot be undone.</p>
                                </div>
                                <div className="confirm-actions">
                                    <button className="confirm-cancel-button" onClick={this.handleCancelDelete}>
                                        Cancel
                                    </button>
                                    <button className="confirm-delete-button" onClick={this.handleConfirmDelete}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        if (this.state.isEditing) {
            return (
                <div className="center-container-grid">
                    <GoHeavierNavBar />
                    <div className="page-container">
                        <div className="popup-overlay" onClick={this.handleCancelEdit}>
                            <div className="popup-form" onClick={(e) => e.stopPropagation()}>
                                <button className="close-button" onClick={this.handleCancelEdit}>
                                    ✖
                                </button>
                                <h2>Edit Exercise</h2>
                                <form onSubmit={this.handleSubmit}>
                                    <label>
                                        Name: <span className="required">*</span>
                                        <input
                                            type="text"
                                            name="name"
                                            value={this.state.formData.name}
                                            onChange={this.handleChange}
                                            required
                                        />
                                    </label>
                                    <label>
                                        Description:
                                        <textarea
                                            name="description"
                                            value={this.state.formData.description}
                                            onChange={this.handleChange}
                                            rows={3}
                                        />
                                    </label>
                                    <label>
                                        Muscle Group:
                                        <select name="muscle_group" value={this.state.formData.muscle_group} onChange={this.handleChange}>
                                            <option value="">Select...</option>
                                            <option value="Chest">Chest</option>
                                            <option value="Back">Back</option>
                                            <option value="Shoulders">Shoulders</option>
                                            <option value="Arms">Arms</option>
                                            <option value="Legs">Legs</option>
                                            <option value="Core">Core</option>
                                            <option value="Full Body">Full Body</option>
                                        </select>
                                    </label>
                                    <label>
                                        Specific Muscle:
                                        <input
                                            type="text"
                                            name="specific_muscle"
                                            value={this.state.formData.specific_muscle}
                                            onChange={this.handleChange}
                                            placeholder="e.g., Biceps, Quads"
                                        />
                                    </label>
                                    <label>
                                        Image URL:
                                        <input
                                            type="url"
                                            name="image_url"
                                            value={this.state.formData.image_url}
                                            onChange={this.handleChange}
                                            placeholder="https://..."
                                        />
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="bipedal"
                                            checked={this.state.formData.bipedal}
                                            onChange={this.handleChange}
                                        />
                                        <span>Unilateral (One side at a time)</span>
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="free_weights"
                                            checked={this.state.formData.free_weights}
                                            onChange={this.handleChange}
                                        />
                                        <span>Free Weights</span>
                                    </label>
                                    {this.state.formError && <p className="error-message">{this.state.formError}</p>}
                                    <div className="form-actions">
                                        <button type="submit" disabled={this.state.formLoading}>
                                            {this.state.formLoading ? "Saving..." : "Save Changes"}
                                        </button>
                                        <button type="button" onClick={this.handleCancelEdit}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    <button className="back-button" onClick={this.handleBack}>
                        ← Back to Exercises
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

                    {this.state.exercise && (
                        <div className={`exercise-detail-container ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="exercise-detail-header">
                                <h1>{this.state.exercise.name}</h1>
                                {this.state.exercise.description && (
                                    <p className="exercise-detail-description">{this.state.exercise.description}</p>
                                )}
                                <div className="action-buttons">
                                    <button className="edit-action-button" onClick={this.handleEdit}>
                                        ✏️ Edit Exercise
                                    </button>
                                    <button
                                        className="delete-action-button"
                                        onClick={this.handleDelete}
                                        disabled
                                        title="Deleting is restricted to admins"
                                    >
                                        🗑️ Delete Exercise
                                    </button>
                                </div>
                            </div>

                            <div className="exercise-detail-main">
                                {this.state.exercise.image_url && (
                                    <div className="exercise-detail-image">
                                        <img src={this.state.exercise.image_url} alt={this.state.exercise.name} />
                                    </div>
                                )}
                                
                                <div className="exercise-detail-content">
                                <div className="detail-section">
                                    <h3>💪 Exercise Details</h3>
                                    <div className="detail-card">
                                        {this.state.exercise.muscle_group && (
                                            <div className="info-row">
                                                <span className="info-label">Muscle Group:</span>
                                                <span className="info-value">{this.state.exercise.muscle_group}</span>
                                            </div>
                                        )}
                                        {this.state.exercise.specific_muscle && (
                                            <div className="info-row">
                                                <span className="info-label">Specific Muscle:</span>
                                                <span className="info-value">{this.state.exercise.specific_muscle}</span>
                                            </div>
                                        )}
                                        <div className="info-row">
                                            <span className="info-label">Type:</span>
                                            <span className="info-value">
                                                {this.state.exercise.bipedal ? "Unilateral" : "Bilateral"}
                                            </span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Equipment:</span>
                                            <span className="info-value">
                                                {this.state.exercise.free_weights ? "Free Weights" : "Machine/Bodyweight"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h3>📅 Information</h3>
                                    <div className="detail-card">
                                        <div className="info-row">
                                            <span className="info-label">Created:</span>
                                            <span className="info-value">
                                                {new Date(this.state.exercise.created_at).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Last Updated:</span>
                                            <span className="info-value">
                                                {new Date(this.state.exercise.updated_at).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">ID:</span>
                                            <span className="info-value info-id">{this.state.exercise.id}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>

                            <div className="detail-section stats-section">
                                <h3>🕒 Latest Workout</h3>

                                {this.state.setsLoading && (
                                    <div className="detail-card">
                                        <p>Loading latest workout...</p>
                                    </div>
                                )}

                                {this.state.setsError && (
                                    <div className="detail-card">
                                        <p className="error-message">{this.state.setsError}</p>
                                    </div>
                                )}

                                {!this.state.setsLoading && !this.state.setsError && this.state.exerciseSets && (
                                    latestSets.length === 0 ? (
                                        <div className="detail-card">
                                            <p>This exercise has not been logged yet.</p>
                                        </div>
                                    ) : (
                                        <div className="detail-card">
                                            <div className="latest-workout-meta">
                                                <a
                                                    className="latest-workout-date"
                                                    href={`/go-heavier/sessions/${latestSets[0].session_id}`}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        this.props.navigate(`/go-heavier/sessions/${latestSets[0].session_id}`)
                                                    }}
                                                >
                                                    {formatFullDate(latestSession?.workout_time)}
                                                </a>
                                                {latestSession && (
                                                    <a
                                                        className="latest-workout-location"
                                                        href={`/go-heavier/locations/${latestSession.location_id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            this.props.navigate(`/go-heavier/locations/${latestSession.location_id}`)
                                                        }}
                                                    >
                                                        📍 {latestSession.location}
                                                    </a>
                                                )}
                                                <span className="latest-workout-count">
                                                    {latestSets.length} {latestSets.length === 1 ? "set" : "sets"}
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
                                                        {latestSets.map((set) => {
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
                                    )
                                )}
                            </div>

                            <div className="detail-section stats-section">
                                <h3>🏆 Best Set</h3>

                                {this.state.setsLoading && (
                                    <div className="detail-card">
                                        <p>Loading best set...</p>
                                    </div>
                                )}

                                {this.state.setsError && (
                                    <div className="detail-card">
                                        <p className="error-message">{this.state.setsError}</p>
                                    </div>
                                )}

                                {!this.state.setsLoading && !this.state.setsError && this.state.exerciseSets && (
                                    bestSet === null ? (
                                        <div className="detail-card">
                                            <p>This exercise has not been logged yet.</p>
                                        </div>
                                    ) : (
                                        <div className="detail-card">
                                            <div className="best-set-headline">
                                                <span className="best-set-weight">{bestSet.weight_kg.toFixed(1)} kg</span>
                                                <span className="best-set-reps">× {bestSet.repetitions} reps</span>
                                            </div>
                                            <div className="best-set-meta">
                                                <a
                                                    className="latest-workout-location"
                                                    href={`/go-heavier/sessions/${bestSet.session_id}`}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        this.props.navigate(`/go-heavier/sessions/${bestSet.session_id}`)
                                                    }}
                                                >
                                                    {formatFullDate(bestSetSession?.workout_time)}
                                                </a>
                                                {bestSetSession && (
                                                    <a
                                                        className="latest-workout-location"
                                                        href={`/go-heavier/locations/${bestSetSession.location_id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            this.props.navigate(`/go-heavier/locations/${bestSetSession.location_id}`)
                                                        }}
                                                    >
                                                        📍 {bestSetSession.location}
                                                    </a>
                                                )}
                                                <span>Set {bestSet.index}</span>
                                            </div>
                                            {formatNotes(bestSet.notes) && (
                                                <p className="best-set-notes">{formatNotes(bestSet.notes)}</p>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="detail-section stats-section">
                                <h3>📊 Stats</h3>

                                {this.state.statsLoading && (
                                    <div className="detail-card">
                                        <p>Loading stats...</p>
                                    </div>
                                )}

                                {this.state.statsError && (
                                    <div className="detail-card">
                                        <p className="error-message">{this.state.statsError}</p>
                                    </div>
                                )}

                                {!this.state.statsLoading && !this.state.statsError && this.state.stats && (
                                    <>
                                        <div className="stats-grid">
                                            <div className="stat-tile">
                                                <div className="stat-tile-value">{formatCount(this.state.stats.sessions)}</div>
                                                <div className="stat-tile-label">Sessions</div>
                                            </div>
                                            <div className="stat-tile">
                                                <div className="stat-tile-value">{formatCount(this.state.stats.total_sets)}</div>
                                                <div className="stat-tile-label">Sets</div>
                                            </div>
                                            <div className="stat-tile">
                                                <div className="stat-tile-value">{formatCount(this.state.stats.total_repetitions)}</div>
                                                <div className="stat-tile-label">Reps</div>
                                            </div>
                                            <div className="stat-tile">
                                                <div className="stat-tile-value">{formatWeight(this.state.stats.total_volume_kg)}</div>
                                                <div className="stat-tile-label">Total volume</div>
                                            </div>
                                            <div className="stat-tile">
                                                <div className="stat-tile-value">{formatWeight(this.state.stats.heaviest_weight_kg)}</div>
                                                <div className="stat-tile-label">Heaviest lift</div>
                                            </div>
                                            <div className="stat-tile">
                                                <div className="stat-tile-value">{formatCount(this.state.stats.distinct_locations)}</div>
                                                <div className="stat-tile-label">Locations</div>
                                            </div>
                                        </div>

                                        <div className="stats-detail">
                                            <div className="detail-card">
                                                <div className="info-row">
                                                    <span className="info-label">First performed:</span>
                                                    <span className="info-value">{formatLongDate(this.state.stats.first_performed)}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Last performed:</span>
                                                    <span className="info-value">{formatLongDate(this.state.stats.last_performed)}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Sets per session:</span>
                                                    <span className="info-value">{this.state.stats.average_sets_per_session.toFixed(1)}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Reps per set:</span>
                                                    <span className="info-value">{this.state.stats.average_repetitions_per_set.toFixed(1)}</span>
                                                </div>
                                            </div>

                                            {(this.state.stats.top_locations ?? []).length > 0 && (
                                                <div className="detail-card">
                                                    <h4 className="top-list-title">Top locations by sessions</h4>
                                                    <ol className="top-list">
                                                        {this.renderTopLocations(this.state.stats.top_locations ?? [])}
                                                    </ol>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

// Wrapper component to use React Router hooks
export default function ExerciseDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    return <ExerciseDetailClass id={id!} navigate={navigate} />
}
