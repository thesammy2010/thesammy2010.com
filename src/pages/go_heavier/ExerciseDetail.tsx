import React from "react"
import { useParams, useNavigate } from "react-router-dom"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import { API_URL } from "../../configs"
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

interface State {
    exercise: ExerciseData | null
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

    render(): React.ReactNode {
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
                                    <button className="delete-action-button" onClick={this.handleDelete}>
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
