import React from "react"
import { API_URL } from "../../configs"
import { SessionSummary, fetchAllSessions } from "./sessions"
import "./ExerciseForm.css"

interface Props {
    onClose: () => void
    onSuccess: (workout: any) => void
}

interface State {
    formData: {
        session_id: string
        exercise_id: string
        index: number
        repetitions: number
        weight_kg: number
        bar_weight_kg: number
        supplementary_weight_kg: number
        notes: string
    }
    loading: boolean
    error: string | null
    sessions: SessionSummary[]
    exercises: any[]
}

export default class WorkoutForm extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)

        this.state = {
            formData: {
                session_id: "",
                exercise_id: "",
                index: 1,
                repetitions: 10,
                weight_kg: 0,
                bar_weight_kg: 0,
                supplementary_weight_kg: 0,
                notes: ""
            },
            loading: false,
            error: null,
            sessions: [],
            exercises: []
        }
    }

    componentDidMount() {
        this.fetchSessionsAndExercises()
    }

    // Sessions are read only on the API, so a new set has to join an existing one.
    fetchSessionsAndExercises = async () => {
        try {
            const [sessions, exercisesRes] = await Promise.all([
                fetchAllSessions(),
                fetch(`${API_URL}/go-heavier/exercises`)
            ])

            const exercises = await exercisesRes.json()

            this.setState({ 
                sessions, 
                exercises,
                formData: {
                    ...this.state.formData,
                    session_id: sessions.length > 0 ? sessions[0].id : "",
                    exercise_id: exercises.length > 0 ? exercises[0].id : ""
                }
            })
        } catch (error) {
            console.error("Error fetching data:", error)
            this.setState({ error: "Failed to load sessions and exercises" })
        }
    }

    formatSessionOption = (session: SessionSummary): string => {
        const when = new Date(session.workout_time).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
        return `${when} — ${session.location}`
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        
        this.setState((prevState) => ({
            formData: {
                ...prevState.formData,
                [name]: type === "number" ? parseFloat(value) || 0 : value
            }
        }))
    }

    validateForm = (): boolean => {
        const {
            session_id,
            exercise_id,
            index,
            repetitions,
            weight_kg,
            bar_weight_kg,
            supplementary_weight_kg
        } = this.state.formData

        if (!session_id || !exercise_id) {
            this.setState({ error: "Session and Exercise are required" })
            return false
        }

        if (index < 1 || index > 99) {
            this.setState({ error: "Set number must be between 1 and 99" })
            return false
        }

        if (repetitions < 1 || repetitions > 99) {
            this.setState({ error: "Repetitions must be between 1 and 99" })
            return false
        }

        // Negative weight is valid: an assisted machine takes weight off the lifter.
        if (weight_kg <= -1000 || weight_kg >= 1000) {
            this.setState({ error: "Weight must be between -999 and 999 kg" })
            return false
        }

        if (bar_weight_kg < 0 || bar_weight_kg >= 100) {
            this.setState({ error: "Bar weight must be between 0 and 99 kg" })
            return false
        }

        if (supplementary_weight_kg <= -100 || supplementary_weight_kg >= 100) {
            this.setState({ error: "Supplementary weight must be between -99 and 99 kg" })
            return false
        }

        return true
    }

    // The API takes null rather than zero for the optional weights, and rejects a
    // bar weight of zero outright.
    buildPayload = () => {
        const { bar_weight_kg, supplementary_weight_kg, notes, ...rest } = this.state.formData

        return {
            ...rest,
            bar_weight_kg: bar_weight_kg > 0 ? bar_weight_kg : null,
            supplementary_weight_kg: supplementary_weight_kg !== 0 ? supplementary_weight_kg : null,
            notes: notes.trim() ? notes.trim() : null
        }
    }

    handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ error: null })

        if (!this.validateForm()) {
            return
        }

        this.setState({ loading: true })

        try {
            const response = await fetch(`${API_URL}/go-heavier/workouts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ workouts: [this.buildPayload()] })
            })

            if (!response.ok) {
                throw new Error("Failed to create workout")
            }

            const result = await response.json()
            this.props.onSuccess(result)
        } catch (err) {
            this.setState({ error: (err as Error).message, loading: false })
        }
    }

    render(): React.ReactNode {
        return (
            <div className="popup-overlay" onClick={this.props.onClose}>
                <div className="popup-form" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={this.props.onClose}>
                        ✖
                    </button>
                    <h2>Add New Workout</h2>
                    <form onSubmit={this.handleSubmit}>
                        <label>
                            Session: <span className="required">*</span>
                            <select
                                name="session_id"
                                value={this.state.formData.session_id}
                                onChange={this.handleChange}
                                required
                            >
                                <option value="">Select session...</option>
                                {this.state.sessions.map(session => (
                                    <option key={session.id} value={session.id}>
                                        {this.formatSessionOption(session)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Exercise: <span className="required">*</span>
                            <select
                                name="exercise_id"
                                value={this.state.formData.exercise_id}
                                onChange={this.handleChange}
                                required
                            >
                                <option value="">Select exercise...</option>
                                {this.state.exercises.map(exercise => (
                                    <option key={exercise.id} value={exercise.id}>
                                        {exercise.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Set Number: <span className="required">*</span>
                            <input
                                type="number"
                                name="index"
                                value={this.state.formData.index}
                                onChange={this.handleChange}
                                min="1"
                                required
                            />
                        </label>

                        <label>
                            Repetitions: <span className="required">*</span>
                            <input
                                type="number"
                                name="repetitions"
                                value={this.state.formData.repetitions}
                                onChange={this.handleChange}
                                min="1"
                                required
                            />
                        </label>

                        <label>
                            Weight (kg): <span className="required">*</span>
                            <input
                                type="number"
                                name="weight_kg"
                                value={this.state.formData.weight_kg}
                                onChange={this.handleChange}
                                step="0.1"
                                min="0"
                                required
                            />
                        </label>

                        <label>
                            Bar Weight (kg):
                            <input
                                type="number"
                                name="bar_weight_kg"
                                value={this.state.formData.bar_weight_kg}
                                onChange={this.handleChange}
                                step="0.1"
                                min="0"
                            />
                        </label>

                        <label>
                            Supplementary Weight (kg):
                            <input
                                type="number"
                                name="supplementary_weight_kg"
                                value={this.state.formData.supplementary_weight_kg}
                                onChange={this.handleChange}
                                step="0.1"
                                min="0"
                            />
                        </label>

                        <label>
                            Notes:
                            <textarea
                                name="notes"
                                value={this.state.formData.notes}
                                onChange={this.handleChange}
                                rows={3}
                                maxLength={512}
                                placeholder="Optional notes about this set..."
                            />
                        </label>

                        {this.state.error && <p className="error-message">{this.state.error}</p>}
                        <div className="form-actions">
                            <button type="submit" disabled={this.state.loading}>
                                {this.state.loading ? "Creating..." : "Create Workout"}
                            </button>
                            <button type="button" onClick={this.props.onClose}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }
}
