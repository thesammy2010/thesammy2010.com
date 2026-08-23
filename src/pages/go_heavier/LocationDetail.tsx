import React from "react"
import { useParams, useNavigate } from "react-router-dom"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import { API_URL, countryCodeToEmoji } from "../../configs"
import "../../components/go_heavier/Stats.css"
import "./LocationDetail.css"
import "../go_heavier/Locations.css"
import "../../components/go_heavier/LocationForm.css"

interface LocationData {
    id: string
    name: string
    description: string
    address_line1: string
    address_line2: string
    address_city: string
    address_country_iso3: string
    address_postal_code: string
    logo_url: string
    created_at: string
    updated_at: string
}

interface TopExercise {
    exercise_id: string
    name: string
    visits: number
    sets: number
    repetitions: number
    volume_kg: number
}

interface LocationStatsData {
    location_id: string
    name: string
    visits: number
    first_visit: string | null
    last_visit: string | null
    total_sets: number
    total_repetitions: number
    total_volume_kg: number
    heaviest_weight_kg: number | null
    average_sets_per_visit: number
    average_exercises_per_visit: number
    distinct_exercises: number
    top_exercises?: TopExercise[]
}

interface State {
    location: LocationData | null
    stats: LocationStatsData | null
    statsLoading: boolean
    statsError: string | null
    loading: boolean
    error: string | null
    isRefreshing: boolean
    isEditing: boolean
    showDeleteConfirm: boolean
    formData: {
        name: string
        description: string
        address_line1: string
        address_line2: string
        address_city: string
        address_country_iso3: string
        address_postal_code: string
        logo_url: string
    }
    formLoading: boolean
    formError: string | null
}

class LocationDetailClass extends React.Component<{ id: string; navigate: any }, State> {
    constructor(props: { id: string; navigate: any }) {
        super(props)
        this.state = {
            location: null,
            stats: null,
            statsLoading: true,
            statsError: null,
            loading: true,
            error: null,
            isRefreshing: false,
            isEditing: false,
            showDeleteConfirm: false,
            formData: {
                name: "",
                description: "",
                address_line1: "",
                address_line2: "",
                address_city: "",
                address_country_iso3: "",
                address_postal_code: "",
                logo_url: ""
            },
            formLoading: false,
            formError: null
        }
    }

    componentDidMount() {
        this.fetchLocation()
        this.fetchStats()
    }

    fetchStats = async () => {
        this.setState({ statsLoading: true, statsError: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/locations/${this.props.id}/stats`)
            if (!response.ok) {
                throw new Error("Failed to load stats")
            }
            const stats = await response.json()
            this.setState({ stats, statsLoading: false })
        } catch (error) {
            console.error("Error fetching location stats:", error)
            this.setState({ statsError: (error as Error).message, statsLoading: false })
        }
    }

    fetchLocation = async () => {
        this.setState({ loading: true, error: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/locations/${this.props.id}`)
            if (!response.ok) {
                throw new Error("Location not found")
            }
            const result = await response.json()
            this.setState({ 
                location: result, 
                loading: false,
                formData: {
                    name: result.name,
                    description: result.description,
                    address_line1: result.address_line1,
                    address_line2: result.address_line2,
                    address_city: result.address_city,
                    address_country_iso3: result.address_country_iso3,
                    address_postal_code: result.address_postal_code,
                    logo_url: result.logo_url || ""
                }
            })
        } catch (error) {
            console.error("Error fetching location:", error)
            this.setState({ error: (error as Error).message, loading: false })
        }
    }

    handleRefresh = async () => {
        this.setState({ isRefreshing: true })
        this.fetchStats()
        try {
            const response = await fetch(`${API_URL}/go-heavier/locations/${this.props.id}`)
            if (!response.ok) {
                throw new Error("Location not found")
            }
            const result = await response.json()
            setTimeout(() => {
                this.setState({ location: result, isRefreshing: false })
            }, 300)
        } catch (error) {
            console.error("Error fetching location:", error)
            this.setState({ error: (error as Error).message, isRefreshing: false })
        }
    }

    handleBack = () => {
        this.props.navigate("/go-heavier/locations")
    }

    handleDelete = () => {
        this.setState({ showDeleteConfirm: true })
    }

    handleCancelDelete = () => {
        this.setState({ showDeleteConfirm: false })
    }

    handleConfirmDelete = async () => {
        if (!this.state.location) return

        try {
            await fetch(`${API_URL}/go-heavier/locations/${this.props.id}`, {
                method: "DELETE"
            })
            // Clear cache and navigate back
            sessionStorage.removeItem('go-heavier-locations')
            this.props.navigate("/go-heavier/locations")
        } catch (error) {
            console.error("Error deleting location:", error)
            this.setState({ showDeleteConfirm: false })
            alert("Failed to delete location")
        }
    }

    handleEdit = () => {
        this.setState({ isEditing: true })
    }

    handleCancelEdit = () => {
        if (!this.state.location) return
        
        this.setState({
            isEditing: false,
            formData: {
                name: this.state.location.name,
                description: this.state.location.description,
                address_line1: this.state.location.address_line1,
                address_line2: this.state.location.address_line2,
                address_city: this.state.location.address_city,
                address_country_iso3: this.state.location.address_country_iso3,
                address_postal_code: this.state.location.address_postal_code,
                logo_url: this.state.location.logo_url || ""
            },
            formError: null
        })
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        this.setState((prevState) => ({
            formData: { ...prevState.formData, [name]: value }
        }))
    }

    validateForm = (): boolean => {
        const { name, address_line1, address_city, address_country_iso3, address_postal_code, logo_url } = this.state.formData

        if (!name.trim()) {
            this.setState({ formError: "Name is required" })
            return false
        }

        if (!address_line1.trim()) {
            this.setState({ formError: "Address Line 1 is required" })
            return false
        }

        if (!address_city.trim()) {
            this.setState({ formError: "City is required" })
            return false
        }

        if (!address_country_iso3.trim()) {
            this.setState({ formError: "Country code is required" })
            return false
        }

        if (address_country_iso3.length !== 3) {
            this.setState({ formError: "Country code must be exactly 3 characters (ISO3 format)" })
            return false
        }

        if (!address_postal_code.trim()) {
            this.setState({ formError: "Postal code is required" })
            return false
        }

        if (logo_url.trim()) {
            try {
                new URL(logo_url.trim())
            } catch {
                this.setState({ formError: "Logo URL must be a valid URL" })
                return false
            }
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
            const response = await fetch(`${API_URL}/go-heavier/locations/${this.props.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.formData)
            })

            if (!response.ok) {
                throw new Error("Failed to update location")
            }

            const result = await response.json()
            
            // Clear cache and update local state
            sessionStorage.removeItem('go-heavier-locations')
            this.setState({ 
                location: result,
                isEditing: false,
                formLoading: false
            })
        } catch (err) {
            this.setState({ formError: (err as Error).message, formLoading: false })
        }
    }

    formatCount = (value: number): string => value.toLocaleString()

    formatWeight = (value: number | null): string =>
        value === null || value === undefined ? "\u2014" : `${Math.round(value).toLocaleString()} kg`

    formatVisitDate = (value: string | null): string => {
        if (!value) {
            return "\u2014"
        }
        return new Date(value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        })
    }

    // The bar length encodes visits, the same measure the list is ordered by.
    renderTopExercises = (topExercises: TopExercise[]): React.ReactNode => {
        const mostVisits = Math.max(...topExercises.map(exercise => exercise.visits), 1)

        return topExercises.map((exercise) => (
            <li key={exercise.exercise_id} className="top-list-item">
                <div className="top-list-head">
                    <a
                        className="top-list-name"
                        href={`/go-heavier/exercises/${exercise.exercise_id}`}
                        onClick={(e) => {
                            e.preventDefault()
                            this.props.navigate(`/go-heavier/exercises/${exercise.exercise_id}`)
                        }}
                    >
                        {exercise.name}
                    </a>
                    <span className="top-list-metric">
                        {this.formatCount(exercise.visits)} visits
                    </span>
                </div>
                <div className="top-list-bar-track">
                    <div
                        className="top-list-bar"
                        style={{ width: `${(exercise.visits / mostVisits) * 100}%` }}
                    />
                </div>
                <div className="top-list-meta">
                    {this.formatCount(exercise.sets)} sets · {this.formatCount(exercise.repetitions)} reps · {this.formatWeight(exercise.volume_kg)}
                </div>
            </li>
        ))
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
                                    <h3>Delete Location?</h3>
                                    <p>Are you sure you want to delete <strong>"{this.state.location?.name}"</strong>?</p>
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
                                <h2>Edit Location</h2>
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
                                        Address Line 1: <span className="required">*</span>
                                        <input
                                            type="text"
                                            name="address_line1"
                                            value={this.state.formData.address_line1}
                                            onChange={this.handleChange}
                                            required
                                        />
                                    </label>
                                    <label>
                                        Address Line 2:
                                        <input
                                            type="text"
                                            name="address_line2"
                                            value={this.state.formData.address_line2}
                                            onChange={this.handleChange}
                                        />
                                    </label>
                                    <label>
                                        City: <span className="required">*</span>
                                        <input
                                            type="text"
                                            name="address_city"
                                            value={this.state.formData.address_city}
                                            onChange={this.handleChange}
                                            required
                                        />
                                    </label>
                                    <label>
                                        Country Code (ISO3): <span className="required">*</span>
                                        <input
                                            type="text"
                                            name="address_country_iso3"
                                            value={this.state.formData.address_country_iso3}
                                            onChange={this.handleChange}
                                            maxLength={3}
                                            placeholder="e.g., USA, GBR"
                                            required
                                        />
                                    </label>
                                    <label>
                                        Postal Code: <span className="required">*</span>
                                        <input
                                            type="text"
                                            name="address_postal_code"
                                            value={this.state.formData.address_postal_code}
                                            onChange={this.handleChange}
                                            required
                                        />
                                    </label>
                                    <label>
                                        Logo URL:
                                        <input
                                            type="url"
                                            name="logo_url"
                                            value={this.state.formData.logo_url}
                                            onChange={this.handleChange}
                                            placeholder="https://..."
                                        />
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
                        ← Back to Locations
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

                    {this.state.location && (
                        <div className={`location-detail-container ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="location-detail-header">
                                {this.state.location.logo_url && (
                                    <div className="location-detail-logo">
                                        <img src={this.state.location.logo_url} alt={`${this.state.location.name} logo`} />
                                    </div>
                                )}
                                <h1>{this.state.location.name} {countryCodeToEmoji(this.state.location.address_country_iso3.substring(0, 2))}</h1>
                                <p className="location-detail-description">{this.state.location.description}</p>
                                <div className="action-buttons">
                                    <button className="edit-action-button" onClick={this.handleEdit}>
                                        ✏️ Edit Location
                                    </button>
                                    <button
                                        className="delete-action-button"
                                        onClick={this.handleDelete}
                                        disabled
                                        title="Deleting is restricted to admins"
                                    >
                                        🗑️ Delete Location
                                    </button>
                                </div>
                            </div>

                            <div className="location-detail-content">
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
                                                    <div className="stat-tile-value">{this.formatCount(this.state.stats.visits)}</div>
                                                    <div className="stat-tile-label">Visits</div>
                                                </div>
                                                <div className="stat-tile">
                                                    <div className="stat-tile-value">{this.formatCount(this.state.stats.total_sets)}</div>
                                                    <div className="stat-tile-label">Sets</div>
                                                </div>
                                                <div className="stat-tile">
                                                    <div className="stat-tile-value">{this.formatCount(this.state.stats.total_repetitions)}</div>
                                                    <div className="stat-tile-label">Reps</div>
                                                </div>
                                                <div className="stat-tile">
                                                    <div className="stat-tile-value">{this.formatWeight(this.state.stats.total_volume_kg)}</div>
                                                    <div className="stat-tile-label">Total volume</div>
                                                </div>
                                                <div className="stat-tile">
                                                    <div className="stat-tile-value">{this.formatWeight(this.state.stats.heaviest_weight_kg)}</div>
                                                    <div className="stat-tile-label">Heaviest lift</div>
                                                </div>
                                                <div className="stat-tile">
                                                    <div className="stat-tile-value">{this.formatCount(this.state.stats.distinct_exercises)}</div>
                                                    <div className="stat-tile-label">Exercises</div>
                                                </div>
                                            </div>

                                            <div className="stats-detail">
                                                <div className="detail-card">
                                                    <div className="info-row">
                                                        <span className="info-label">First visit:</span>
                                                        <span className="info-value">{this.formatVisitDate(this.state.stats.first_visit)}</span>
                                                    </div>
                                                    <div className="info-row">
                                                        <span className="info-label">Last visit:</span>
                                                        <span className="info-value">{this.formatVisitDate(this.state.stats.last_visit)}</span>
                                                    </div>
                                                    <div className="info-row">
                                                        <span className="info-label">Sets per visit:</span>
                                                        <span className="info-value">{this.state.stats.average_sets_per_visit.toFixed(1)}</span>
                                                    </div>
                                                    <div className="info-row">
                                                        <span className="info-label">Exercises per visit:</span>
                                                        <span className="info-value">{this.state.stats.average_exercises_per_visit.toFixed(1)}</span>
                                                    </div>
                                                </div>

                                                {(this.state.stats.top_exercises ?? []).length > 0 && (
                                                    <div className="detail-card">
                                                        <h4 className="top-list-title">Top exercises by visits</h4>
                                                        <ol className="top-list">
                                                            {this.renderTopExercises(this.state.stats.top_exercises ?? [])}
                                                        </ol>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h3>📍 Address</h3>
                                    <div className="detail-card">
                                        <p>{this.state.location.address_line1}</p>
                                        {this.state.location.address_line2 && <p>{this.state.location.address_line2}</p>}
                                        <p>{this.state.location.address_city}</p>
                                        <p>{this.state.location.address_postal_code}</p>
                                        <p><strong>{this.state.location.address_country_iso3}</strong></p>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h3>📅 Information</h3>
                                    <div className="detail-card">
                                        <div className="info-row">
                                            <span className="info-label">Created:</span>
                                            <span className="info-value">
                                                {new Date(this.state.location.created_at).toLocaleDateString("en-US", {
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
                                                {new Date(this.state.location.updated_at).toLocaleDateString("en-US", {
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
                                            <span className="info-value info-id">{this.state.location.id}</span>
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
export default function LocationDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    return <LocationDetailClass id={id!} navigate={navigate} />
}
