import React from "react"
import "./ExerciseForm.css"
import { API_URL } from "../../configs"

interface ExerciseFormProps {
    onClose: () => void
    onSuccess: (newExercise: object) => void
}

interface ExerciseFormState {
    formData: {
        name: string
        description: string
        muscle_group: string
        specific_muscle: string
        bipedal: boolean
        free_weights: boolean
        image_url: string
    }
    loading: boolean
    error: string | null
}

export default class ExerciseForm extends React.Component<ExerciseFormProps, ExerciseFormState> {
    constructor(props: ExerciseFormProps) {
        super(props)
        this.state = {
            formData: {
                name: "",
                description: "",
                muscle_group: "",
                specific_muscle: "",
                bipedal: false,
                free_weights: false,
                image_url: ""
            },
            loading: false,
            error: null
        }
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

    handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ loading: true, error: null })

        try {
            const response = await fetch(`${API_URL}/go-heavier/exercises`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.formData)
            })

            if (!response.ok) {
                throw new Error("Failed to create exercise")
            }

            const newExercise = await response.json()
            this.props.onSuccess(newExercise)
            this.props.onClose()
        } catch (err) {
            this.setState({ error: (err as Error).message })
        } finally {
            this.setState({ loading: false })
        }
    }

    render() {
        const { formData, loading, error } = this.state

        return (
            <div className="popup-overlay" onClick={this.props.onClose}>
                <div className="popup-form" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={this.props.onClose}>
                        ✖
                    </button>
                    <h2>Create New Exercise</h2>
                    <form onSubmit={this.handleSubmit}>
                        <label>
                            Name: <span className="required">*</span>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={this.handleChange}
                                required
                            />
                        </label>
                        <label>
                            Description:
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={this.handleChange} 
                                rows={3} 
                            />
                        </label>
                        <label>
                            Muscle Group:
                            <select name="muscle_group" value={formData.muscle_group} onChange={this.handleChange}>
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
                                value={formData.specific_muscle}
                                onChange={this.handleChange}
                                placeholder="e.g., Biceps, Quads"
                            />
                        </label>
                        <label>
                            Image URL:
                            <input
                                type="url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={this.handleChange}
                                placeholder="https://..."
                            />
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="bipedal"
                                checked={formData.bipedal}
                                onChange={this.handleChange}
                            />
                            <span>Unilateral (One side at a time)</span>
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="free_weights"
                                checked={formData.free_weights}
                                onChange={this.handleChange}
                            />
                            <span>Free Weights</span>
                        </label>
                        {error && <p className="error-message">{error}</p>}
                        <div className="form-actions">
                            <button type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create Exercise"}
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
