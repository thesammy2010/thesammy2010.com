import React from "react"

import { API_URL, ApiError } from "../../configs"
import { apiFetch } from "../../auth"
import ExercisePicker, { PickableExercise } from "./ExercisePicker"
import {
    MAX_WORKOUTS_PER_REQUEST,
    SetRow,
    buildPayloads,
    chunk,
    countByExercise,
    emptyRow,
    nowForInput,
    setIndexes,
    toInstant,
    validateRows
} from "./logWorkout"
import "./LocationForm.css"
import "./LogWorkoutWizard.css"

interface Props {
    onClose: () => void
    onSaved: (sessionId: string) => void
    // Supplied when adding to a session that already exists, which skips step one.
    session?: { id: string; label: string }
}

interface State {
    step: "session" | "sets"
    locations: any[]
    exercises: PickableExercise[]
    locationId: string
    workoutTime: string
    sessionId: string | null
    sessionLabel: string
    rows: SetRow[]
    // Sets the session already holds, per exercise, so numbering continues.
    alreadyLogged: Record<string, number>
    loading: boolean
    error: string | null
}

export default class LogWorkoutWizard extends React.Component<Props, State> {
    private nextKey = 0

    constructor(props: Props) {
        super(props)

        const existing = props.session
        this.nextKey = 1

        this.state = {
            step: existing ? "sets" : "session",
            locations: [],
            exercises: [],
            locationId: "",
            workoutTime: nowForInput(new Date()),
            sessionId: existing ? existing.id : null,
            sessionLabel: existing ? existing.label : "",
            rows: existing ? [emptyRow("row-1")] : [],
            alreadyLogged: {},
            loading: false,
            error: null
        }
    }

    componentDidMount() {
        this.fetchOptions()

        if (this.props.session) {
            this.fetchExistingSets(this.props.session.id)
        }
    }

    // Adding to a session that already has sets: pick up the numbering where it
    // left off rather than starting a second "set 1" for the same exercise.
    fetchExistingSets = async (sessionId: string) => {
        try {
            const response = await apiFetch(`${API_URL}/go-heavier/workouts?session_id=${sessionId}`)
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to load the session's sets")
            }
            const sets = await response.json()
            this.setState({ alreadyLogged: countByExercise(sets) })
        } catch (error) {
            console.error("Error loading existing sets:", error)
            this.setState({ error: (error as Error).message })
        }
    }

    makeKey = (): string => {
        this.nextKey += 1
        return `row-${this.nextKey}`
    }

    fetchOptions = async () => {
        try {
            const [locationsRes, exercisesRes] = await Promise.all([
                apiFetch(`${API_URL}/go-heavier/locations`),
                apiFetch(`${API_URL}/go-heavier/exercises`)
            ])

            if (!locationsRes.ok) {
                throw new ApiError(locationsRes.status, "Failed to load locations and exercises")
            }
            if (!exercisesRes.ok) {
                throw new ApiError(exercisesRes.status, "Failed to load locations and exercises")
            }

            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()

            this.setState({
                locations,
                exercises,
                locationId: locations.length > 0 ? locations[0].id : ""
            })
        } catch (error) {
            console.error("Error loading form options:", error)
            this.setState({ error: (error as Error).message })
        }
    }

    // Step one: the session has to exist before any set can point at it.
    handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ error: null })

        if (!this.state.locationId) {
            this.setState({ error: "Pick where you trained" })
            return
        }

        if (!this.state.workoutTime) {
            this.setState({ error: "Pick when you trained" })
            return
        }

        this.setState({ loading: true })
        try {
            const response = await apiFetch(`${API_URL}/go-heavier/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    location_id: this.state.locationId,
                    workout_time: toInstant(this.state.workoutTime)
                })
            })

            if (!response.ok) {
                throw new ApiError(response.status, "Failed to create the session")
            }

            const session = await response.json()
            const when = new Date(session.workout_time).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })

            this.setState({
                step: "sets",
                sessionId: session.id,
                sessionLabel: `${when} · ${session.location}`,
                rows: [emptyRow(this.makeKey())],
                loading: false
            })
        } catch (error) {
            this.setState({ error: (error as Error).message, loading: false })
        }
    }

    updateRow = (key: string, field: keyof Omit<SetRow, "key">, value: string) => {
        this.setState(prev => ({
            rows: prev.rows.map(row => (row.key === key ? { ...row, [field]: value } : row))
        }))
    }

    addRow = () => {
        this.setState(prev => {
            // Carry the last exercise over: the next set is usually the same lift.
            const last = prev.rows[prev.rows.length - 1]
            return { rows: [...prev.rows, emptyRow(this.makeKey(), last ? last.exerciseId : "")] }
        })
    }

    // The point of the copy button: another set of the same thing is one click.
    duplicateRow = (key: string) => {
        this.setState(prev => {
            const position = prev.rows.findIndex(row => row.key === key)
            if (position === -1) {
                return null
            }

            const copy = { ...prev.rows[position], key: this.makeKey() }
            const rows = [...prev.rows]
            rows.splice(position + 1, 0, copy)
            return { rows }
        })
    }

    removeRow = (key: string) => {
        this.setState(prev => ({ rows: prev.rows.filter(row => row.key !== key) }))
    }

    handleSubmitSets = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ error: null })

        const problem = validateRows(this.state.rows)
        if (problem) {
            this.setState({ error: problem })
            return
        }

        this.setState({ loading: true })
        try {
            const payloads = buildPayloads(this.state.rows, this.state.sessionId!, this.state.alreadyLogged)

            // The endpoint takes ten sets at a time, so a long session goes up in
            // batches rather than one oversized request.
            for (const batch of chunk(payloads, MAX_WORKOUTS_PER_REQUEST)) {
                const response = await apiFetch(`${API_URL}/go-heavier/workouts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ workouts: batch })
                })

                if (!response.ok) {
                    throw new ApiError(response.status, "Failed to save the sets")
                }
            }

            this.props.onSaved(this.state.sessionId!)
        } catch (error) {
            this.setState({ error: (error as Error).message, loading: false })
        }
    }

    renderSessionStep(): React.ReactNode {
        return (
            <form onSubmit={this.handleCreateSession}>
                <p className="wizard-hint">
                    Start with where and when. Sets get added once the session exists.
                </p>

                <label>
                    Location: <span className="required">*</span>
                    <select
                        value={this.state.locationId}
                        onChange={(e) => this.setState({ locationId: e.target.value })}
                        required
                    >
                        <option value="">Select location...</option>
                        {this.state.locations.map(location => (
                            <option key={location.id} value={location.id}>
                                {location.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Time: <span className="required">*</span>
                    <input
                        type="datetime-local"
                        value={this.state.workoutTime}
                        onChange={(e) => this.setState({ workoutTime: e.target.value })}
                        required
                    />
                </label>

                {this.state.error && <p className="error-message">{this.state.error}</p>}

                <div className="form-actions">
                    <button type="submit" disabled={this.state.loading}>
                        {this.state.loading ? "Starting..." : "Start session"}
                    </button>
                    <button type="button" onClick={this.props.onClose}>
                        Cancel
                    </button>
                </div>
            </form>
        )
    }

    renderSetsStep(): React.ReactNode {
        const indexes = setIndexes(this.state.rows, this.state.alreadyLogged)
        const batches = chunk(this.state.rows, MAX_WORKOUTS_PER_REQUEST).length

        return (
            <form onSubmit={this.handleSubmitSets}>
                <p className="wizard-session-label">📍 {this.state.sessionLabel}</p>

                <div className="set-rows">
                    {this.state.rows.map((row, position) => (
                        <div key={row.key} className="set-row">
                            <div className="set-row-head">
                                <span className="set-row-number">Set {indexes[position]}</span>
                                <div className="set-row-actions">
                                    <button
                                        type="button"
                                        onClick={() => this.duplicateRow(row.key)}
                                        title="Copy this set"
                                    >
                                        ⧉ Copy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => this.removeRow(row.key)}
                                        title="Remove this set"
                                        disabled={this.state.rows.length === 1}
                                    >
                                        ✖
                                    </button>
                                </div>
                            </div>

                            <div className="set-row-fields">
                                <label className="set-field set-field-exercise">
                                    <span>Exercise</span>
                                    <ExercisePicker
                                        exercises={this.state.exercises}
                                        value={row.exerciseId}
                                        onChange={(id) => this.updateRow(row.key, "exerciseId", id)}
                                        label={`Exercise for set ${position + 1}`}
                                    />
                                </label>

                                <label className="set-field">
                                    <span>Reps</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={row.repetitions}
                                        onChange={(e) => this.updateRow(row.key, "repetitions", e.target.value)}
                                    />
                                </label>

                                <label className="set-field">
                                    <span>Weight (kg)</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={row.weightKg}
                                        onChange={(e) => this.updateRow(row.key, "weightKg", e.target.value)}
                                    />
                                </label>

                                <label className="set-field">
                                    <span>Bar (kg)</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="—"
                                        value={row.barWeightKg}
                                        onChange={(e) => this.updateRow(row.key, "barWeightKg", e.target.value)}
                                    />
                                </label>

                                <label className="set-field">
                                    <span>Extra (kg)</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="—"
                                        value={row.supplementaryWeightKg}
                                        onChange={(e) =>
                                            this.updateRow(row.key, "supplementaryWeightKg", e.target.value)
                                        }
                                    />
                                </label>

                                <label className="set-field set-field-notes">
                                    <span>Notes</span>
                                    <input
                                        type="text"
                                        maxLength={512}
                                        placeholder="Optional"
                                        value={row.notes}
                                        onChange={(e) => this.updateRow(row.key, "notes", e.target.value)}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <button type="button" className="add-set-button" onClick={this.addRow}>
                    ➕ Add another set
                </button>

                {this.state.error && <p className="error-message">{this.state.error}</p>}

                <div className="form-actions">
                    <button type="submit" disabled={this.state.loading}>
                        {this.state.loading
                            ? "Saving..."
                            : `Save ${this.state.rows.length} ${this.state.rows.length === 1 ? "set" : "sets"}`}
                    </button>
                    <button type="button" onClick={this.props.onClose}>
                        Done for now
                    </button>
                </div>

                {batches > 1 && (
                    <p className="wizard-hint">
                        Saving in {batches} batches: the API takes {MAX_WORKOUTS_PER_REQUEST} sets at a time.
                    </p>
                )}
            </form>
        )
    }

    render(): React.ReactNode {
        return (
            <div className="popup-overlay" onClick={this.props.onClose}>
                <div
                    className="popup-form log-workout-wizard"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="close-button" onClick={this.props.onClose}>
                        ✖
                    </button>

                    <h2>
                        {this.props.session
                            ? "Add sets"
                            : this.state.step === "session"
                                ? "New session"
                                : "Log your sets"}
                    </h2>

                    {!this.props.session && (
                        <ol className="wizard-steps">
                            <li className={this.state.step === "session" ? "current" : "done"}>
                                1. Session
                            </li>
                            <li className={this.state.step === "sets" ? "current" : ""}>2. Sets</li>
                        </ol>
                    )}

                    {this.state.step === "session" ? this.renderSessionStep() : this.renderSetsStep()}
                </div>
            </div>
        )
    }
}
