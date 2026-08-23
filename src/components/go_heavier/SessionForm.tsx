import React from "react"

import { API_URL } from "../../configs"
import { SessionSummary } from "./sessions"
import "./LocationForm.css"

interface Props {
    onClose: () => void
    onSuccess: (session: SessionSummary) => void
}

interface State {
    formData: {
        location_id: string
        workout_time: string
    }
    locations: any[]
    loading: boolean
    error: string | null
}

export default class SessionForm extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)

        // datetime-local wants a local wall-clock value, not an ISO instant.
        const now = new Date()
        const pad = (value: number) => String(value).padStart(2, '0')
        const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
            + `T${pad(now.getHours())}:${pad(now.getMinutes())}`

        this.state = {
            formData: {
                location_id: "",
                workout_time: localDateTime
            },
            locations: [],
            loading: false,
            error: null
        }
    }

    componentDidMount() {
        this.fetchLocations()
    }

    fetchLocations = async () => {
        try {
            const response = await fetch(`${API_URL}/go-heavier/locations`)
            if (!response.ok) {
                throw new Error("Failed to load locations")
            }
            const locations = await response.json()
            this.setState({
                locations,
                formData: {
                    ...this.state.formData,
                    location_id: locations.length > 0 ? locations[0].id : ""
                }
            })
        } catch (error) {
            console.error("Error fetching locations:", error)
            this.setState({ error: "Failed to load locations" })
        }
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        this.setState((prevState) => ({
            formData: { ...prevState.formData, [name]: value }
        }))
    }

    handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ error: null })

        const { location_id, workout_time } = this.state.formData

        if (!location_id) {
            this.setState({ error: "Location is required" })
            return
        }

        if (!workout_time) {
            this.setState({ error: "Time is required" })
            return
        }

        this.setState({ loading: true })

        try {
            const response = await fetch(`${API_URL}/go-heavier/sessions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    location_id,
                    // The picker gives local wall-clock time; send the instant it means.
                    workout_time: new Date(workout_time).toISOString()
                })
            })

            if (!response.ok) {
                throw new Error("Failed to create session")
            }

            const session = await response.json()
            this.props.onSuccess(session)
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
                    <h2>Add New Session</h2>
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
                            Time: <span className="required">*</span>
                            <input
                                type="datetime-local"
                                name="workout_time"
                                value={this.state.formData.workout_time}
                                onChange={this.handleChange}
                                required
                            />
                        </label>

                        {this.state.error && <p className="error-message">{this.state.error}</p>}
                        <div className="form-actions">
                            <button type="submit" disabled={this.state.loading}>
                                {this.state.loading ? "Creating..." : "Create Session"}
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
