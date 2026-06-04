import React from "react"
import { API_URL } from "../../configs"
import "./ExerciseForm.css"

interface Props {
    onClose: () => void
    onSuccess: (workout: any) => void
}

interface State {
    formData: {
        location_id: string
        exercise_id: string
        exercise_index: number
        workout_time: string
        index: number
        repetitions: number
        weight_kg: number
        bar_weight_kg: number
        supplementary_weight_kg: number
        notes: string
    }
    loading: boolean
    error: string | null
    locations: any[]
    exercises: any[]
}

export default class WorkoutForm extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        
        // Get current date and time in local timezone
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
        
        this.state = {
            formData: {
                location_id: "",
                exercise_id: "",
                exercise_index: 0,
                workout_time: localDateTime,
                index: 1,
                repetitions: 10,
                weight_kg: 0,
                bar_weight_kg: 0,
                supplementary_weight_kg: 0,
                notes: ""
            },
            loading: false,
            error: null,
            locations: [],
            exercises: []
        }
    }

    componentDidMount() {
        this.fetchLocationsAndExercises()
    }

    fetchLocationsAndExercises = async () => {
        try {
            const [locationsRes, exercisesRes] = await Promise.all([
                fetch(`${API_URL}/go-heavier/locations`),
                fetch(`${API_URL}/go-heavier/exercises`)
            ])
            
            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()
            
            this.setState({ 
                locations, 
                exercises,
                formData: {
                    ...this.state.formData,
                    location_id: locations.length > 0 ? locations[0].id : "",
                    exercise_id: exercises.length > 0 ? exercises[0].id : ""
                }
            })
        } catch (error) {
            console.error("Error fetching data:", error)
            this.setState({ error: "Failed to load locations and exercises" })
        }
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
        const { location_id, exercise_id, workout_time, index, repetitions, weight_kg } = this.state.formData

        if (!location_id || !exercise_id) {
            this.setState({ error: "Location and Exercise are required" })
            return false
        }

        if (!workout_time) {
            this.setState({ error: "Workout time is required" })
            return false
        }

        if (index < 1) {
            this.setState({ error: "Set number must be at least 1" })
            return false
        }

        if (repetitions < 1) {
            this.setState({ error: "Repetitions must be at least 1" })
            return false
        }

        if (weight_kg < 0) {
            this.setState({ error: "Weight cannot be negative" })
            return false
        }

        return true
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
                body: JSON.stringify(this.state.formData)
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
                            Location: <span className="required">*</span>
                            <select
                                name="location_id"
                                value={this.state.formData.location_id}
                                onChange={this.handleChange}
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
                            Workout Time: <span className="required">*</span>
                            <input
                                type="datetime-local"
                                name="workout_time"
                                value={this.state.formData.workout_time}
                                onChange={this.handleChange}
                                required
                            />
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
                            Exercise Index:
                            <input
                                type="number"
                                name="exercise_index"
                                value={this.state.formData.exercise_index}
                                onChange={this.handleChange}
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
