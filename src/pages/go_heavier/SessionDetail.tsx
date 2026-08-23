import React from "react"
import { useNavigate, useParams } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import { API_URL, formatNotes } from "../../configs"
import { formatCount, formatFullDateTime, formatWeight } from "../../components/go_heavier/format"
import { SetRow, emptyRow, validateRow } from "../../components/go_heavier/logWorkout"
import LogWorkoutWizard from "../../components/go_heavier/LogWorkoutWizard"
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
    // Only one exercise is editable at a time, keyed by its id.
    editingExerciseId: string | null
    drafts: Record<string, SetRow>
    // Sets marked to be removed, applied on save so Cancel really cancels.
    removing: Record<string, boolean>
    savingEdit: boolean
    editError: string | null
    showAddSets: boolean
    // The exercise queued for wholesale deletion, pending confirmation.
    deleting: { exerciseId: string; name: string; sets: WorkoutSet[] } | null
    deletingAll: boolean
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
            setsError: null,
            editingExerciseId: null,
            drafts: {},
            removing: {},
            savingEdit: false,
            editError: null,
            showAddSets: false,
            deleting: null,
            deletingAll: false
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

    startEdit = (exerciseId: string, sets: WorkoutSet[]) => {
        const drafts: Record<string, SetRow> = {}

        sets.forEach(set => {
            drafts[set.id] = {
                ...emptyRow(set.id, exerciseId),
                repetitions: String(set.repetitions),
                weightKg: String(set.weight_kg),
                barWeightKg: set.bar_weight_kg === null ? "" : String(set.bar_weight_kg),
                supplementaryWeightKg:
                    set.supplementary_weight_kg === null ? "" : String(set.supplementary_weight_kg),
                notes: set.notes ?? ""
            }
        })

        this.setState({ editingExerciseId: exerciseId, drafts, removing: {}, editError: null })
    }

    cancelEdit = () => {
        this.setState({ editingExerciseId: null, drafts: {}, removing: {}, editError: null })
    }

    askDeleteExercise = (exerciseId: string, name: string, sets: WorkoutSet[]) => {
        this.setState({ deleting: { exerciseId, name, sets } })
    }

    cancelDeleteExercise = () => {
        this.setState({ deleting: null })
    }

    confirmDeleteExercise = async () => {
        const queued = this.state.deleting
        if (!queued) {
            return
        }

        this.setState({ deletingAll: true })
        try {
            for (const set of queued.sets) {
                const response = await fetch(`${API_URL}/go-heavier/workouts/${set.id}`, {
                    method: "DELETE"
                })

                if (!response.ok) {
                    throw new Error("Failed to delete the sets")
                }
            }

            this.setState({ deleting: null, deletingAll: false })
            await Promise.all([this.fetchSession(), this.fetchSets()])
        } catch (error) {
            this.setState({ setsError: (error as Error).message, deleting: null, deletingAll: false })
        }
    }

    removalCount = (sets: WorkoutSet[]): number =>
        sets.filter(set => this.state.removing[set.id]).length

    toggleRemoval = (setId: string) => {
        this.setState(prev => ({
            removing: { ...prev.removing, [setId]: !prev.removing[setId] },
            editError: null
        }))
    }

    updateDraft = (setId: string, field: keyof Omit<SetRow, "key">, value: string) => {
        this.setState(prev => ({
            drafts: { ...prev.drafts, [setId]: { ...prev.drafts[setId], [field]: value } }
        }))
    }

    // Each set goes up as a whole workout: the API's update takes the full body.
    saveEdit = async (sets: WorkoutSet[]) => {
        this.setState({ editError: null })

        // A set on its way out does not need to be valid.
        const kept = sets.filter(set => !this.state.removing[set.id])
        const doomed = sets.filter(set => this.state.removing[set.id])

        for (let position = 0; position < kept.length; position++) {
            const problem = validateRow(this.state.drafts[kept[position].id], position)
            if (problem) {
                this.setState({ editError: problem })
                return
            }

            // The API treats null as "leave alone" on an update, and rejects a bar
            // weight of zero, so there is no way to take one back off a set.
            const set = kept[position]
            if (set.bar_weight_kg !== null && this.state.drafts[set.id].barWeightKg.trim() === "") {
                this.setState({
                    editError: `Set ${set.index}: a bar weight cannot be removed once set. Delete the set and add it again instead.`
                })
                return
            }
        }

        this.setState({ savingEdit: true })
        try {
            for (const set of doomed) {
                const response = await fetch(`${API_URL}/go-heavier/workouts/${set.id}`, {
                    method: "DELETE"
                })

                if (!response.ok) {
                    throw new Error("Failed to delete the set")
                }
            }

            for (const set of kept) {
                const draft = this.state.drafts[set.id]
                const response = await fetch(`${API_URL}/go-heavier/workouts/${set.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: set.session_id,
                        exercise_id: set.exercise_id,
                        index: set.index,
                        repetitions: Number(draft.repetitions),
                        weight_kg: Number(draft.weightKg),
                        bar_weight_kg: draft.barWeightKg.trim() === "" ? null : Number(draft.barWeightKg),
                        // Zero and an empty string do clear these two; null would not.
                        supplementary_weight_kg:
                            draft.supplementaryWeightKg.trim() === "" ? 0 : Number(draft.supplementaryWeightKg),
                        notes: draft.notes.trim()
                    })
                })

                if (!response.ok) {
                    throw new Error("Failed to save the changes")
                }
            }

            this.setState({ editingExerciseId: null, drafts: {}, removing: {}, savingEdit: false })
            // The session totals move with the sets, so reload both.
            await Promise.all([this.fetchSession(), this.fetchSets()])
        } catch (error) {
            this.setState({ editError: (error as Error).message, savingEdit: false })
        }
    }

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
                                <h1>{formatFullDateTime(session.workout_time)}</h1>
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
                                        <div className="stat-tile-value">{formatCount(session.repetitions)}</div>
                                        <div className="stat-tile-label">Reps</div>
                                    </div>
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{formatWeight(session.volume_kg)}</div>
                                        <div className="stat-tile-label">Volume</div>
                                    </div>
                                    <div className="stat-tile">
                                        <div className="stat-tile-value">{formatWeight(session.heaviest_weight_kg)}</div>
                                        <div className="stat-tile-label">Heaviest</div>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section stats-section">
                                <div className="section-head">
                                    <h3>🏋️ Exercises</h3>
                                    <button
                                        type="button"
                                        className="edit-set-button primary"
                                        onClick={() => this.setState({ showAddSets: true })}
                                    >
                                        ➕ Add sets
                                    </button>
                                </div>

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

                                {this.state.deleting && (
                                    <div className="popup-overlay" onClick={this.cancelDeleteExercise}>
                                        <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                                            <div className="confirm-header">
                                                <h2>💪 Go Heavier</h2>
                                            </div>
                                            <div className="confirm-content">
                                                <h3>Delete every set?</h3>
                                                <p>
                                                    This removes all {this.state.deleting.sets.length}{" "}
                                                    {this.state.deleting.sets.length === 1 ? "set" : "sets"} of{" "}
                                                    <strong>"{this.state.deleting.name}"</strong> from this session.
                                                </p>
                                                <p className="warning-text">This action cannot be undone.</p>
                                            </div>
                                            <div className="confirm-actions">
                                                <button
                                                    className="confirm-cancel-button"
                                                    onClick={this.cancelDeleteExercise}
                                                    disabled={this.state.deletingAll}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="confirm-delete-button"
                                                    onClick={this.confirmDeleteExercise}
                                                    disabled={this.state.deletingAll}
                                                >
                                                    {this.state.deletingAll ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {this.state.showAddSets && (
                                    <LogWorkoutWizard
                                        session={{
                                            id: session.id,
                                            label: `${formatFullDateTime(session.workout_time)} · ${session.location}`
                                        }}
                                        onClose={() => this.setState({ showAddSets: false })}
                                        onSaved={() => {
                                            this.setState({ showAddSets: false })
                                            this.handleRefresh()
                                        }}
                                    />
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
                                                {exercise.sets} sets · {formatCount(exercise.repetitions)} reps ·{" "}
                                                {formatWeight(exercise.volume_kg)} · top {formatWeight(exercise.heaviest_weight_kg)}
                                            </span>
                                            {this.state.editingExerciseId === exercise.exercise_id ? (
                                                <span className="session-exercise-edit">
                                                    <button
                                                        type="button"
                                                        className="edit-set-button primary"
                                                        onClick={() => this.saveEdit(sets)}
                                                        disabled={this.state.savingEdit}
                                                    >
                                                        {this.state.savingEdit
                                                            ? "Saving..."
                                                            : this.removalCount(sets) > 0
                                                                ? `Save · delete ${this.removalCount(sets)}`
                                                                : "Save"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="edit-set-button"
                                                        onClick={this.cancelEdit}
                                                        disabled={this.state.savingEdit}
                                                    >
                                                        Cancel
                                                    </button>
                                                </span>
                                            ) : (
                                                <span className="session-exercise-edit">
                                                    <button
                                                        type="button"
                                                        className="edit-set-button"
                                                        onClick={() => this.startEdit(exercise.exercise_id, sets)}
                                                        disabled={this.state.editingExerciseId !== null}
                                                        title={`Edit the ${exercise.name} sets`}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="edit-set-button danger"
                                                        onClick={() => this.askDeleteExercise(exercise.exercise_id, exercise.name, sets)}
                                                        disabled={this.state.editingExerciseId !== null}
                                                        title={`Delete every ${exercise.name} set in this session`}
                                                    >
                                                        🗑️ Delete all
                                                    </button>
                                                </span>
                                            )}
                                        </div>

                                        {this.state.editingExerciseId === exercise.exercise_id && this.state.editError && (
                                            <p className="error-message">{this.state.editError}</p>
                                        )}

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
                                                        {this.state.editingExerciseId === exercise.exercise_id && (
                                                            <th><span className="visually-hidden">Delete</span></th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sets.map((set) => {
                                                        const editing = this.state.editingExerciseId === exercise.exercise_id
                                                        const draft = this.state.drafts[set.id]

                                                        if (editing && this.state.removing[set.id]) {
                                                            const total = set.weight_kg +
                                                                (set.bar_weight_kg || 0) +
                                                                (set.supplementary_weight_kg || 0)
                                                            return (
                                                                <tr key={set.id} className="set-row-removing">
                                                                    <td>{set.index}</td>
                                                                    <td>{set.repetitions}</td>
                                                                    <td>{set.weight_kg.toFixed(1)}</td>
                                                                    <td>{set.bar_weight_kg ? set.bar_weight_kg.toFixed(1) : "-"}</td>
                                                                    <td>{set.supplementary_weight_kg ? set.supplementary_weight_kg.toFixed(1) : "-"}</td>
                                                                    <td>{total.toFixed(1)}</td>
                                                                    <td className="set-notes">{formatNotes(set.notes)}</td>
                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="edit-set-button"
                                                                            onClick={() => this.toggleRemoval(set.id)}
                                                                            title={`Keep set ${set.index}`}
                                                                        >
                                                                            Undo
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        }

                                                        if (editing && draft) {
                                                            return (
                                                                <tr key={set.id} className="set-row-editing">
                                                                    <td>{set.index}</td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            aria-label={`Repetitions for set ${set.index}`}
                                                                            value={draft.repetitions}
                                                                            onChange={(e) => this.updateDraft(set.id, "repetitions", e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            aria-label={`Weight for set ${set.index}`}
                                                                            value={draft.weightKg}
                                                                            onChange={(e) => this.updateDraft(set.id, "weightKg", e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            placeholder="—"
                                                                            aria-label={`Bar weight for set ${set.index}`}
                                                                            value={draft.barWeightKg}
                                                                            onChange={(e) => this.updateDraft(set.id, "barWeightKg", e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            placeholder="—"
                                                                            aria-label={`Supplementary weight for set ${set.index}`}
                                                                            value={draft.supplementaryWeightKg}
                                                                            onChange={(e) => this.updateDraft(set.id, "supplementaryWeightKg", e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td className="set-total-placeholder">—</td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            maxLength={512}
                                                                            placeholder="Optional"
                                                                            aria-label={`Notes for set ${set.index}`}
                                                                            value={draft.notes}
                                                                            onChange={(e) => this.updateDraft(set.id, "notes", e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="edit-set-button"
                                                                            onClick={() => this.toggleRemoval(set.id)}
                                                                            title={`Delete set ${set.index}`}
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        }

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
