import React from "react"

import "./Location.css"
import "./LocationForm.css"
import { API_URL, countryCodeToEmoji } from "../../configs"
import { useNavigate } from "react-router-dom"

interface State {
    loaded: boolean
    deleted: boolean
    isEditing: boolean
    formData: {
        name: string
        description: string
        address_line1: string
        address_line2: string
        address_city: string
        address_country_iso3: string
        address_postal_code: string
    }
    loading: boolean
    error: string | null
}

interface Props {
    id: string
    name: string
    description: string
    address_line1: string
    address_line2: string
    address_city: string
    address_country_iso3: string
    address_postal_code: string
    created_at: string
    updated_at: string
    onDeleted?: (locationName: string) => void
    navigate: any
}

export class Location extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            loaded: true,
            deleted: false,
            isEditing: false,
            formData: {
                name: props.name,
                description: props.description,
                address_line1: props.address_line1,
                address_line2: props.address_line2,
                address_city: props.address_city,
                address_country_iso3: props.address_country_iso3,
                address_postal_code: props.address_postal_code
            },
            loading: false,
            error: null
        }
    }

    handleDelete = async () => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${this.props.name}"? This action cannot be undone.`
        )
        
        if (!confirmed) {
            return
        }

        const locationName = this.props.name

        await fetch(`${API_URL}/go-heavier/locations/${this.props.id}`, {
            method: "DELETE"
        })
        this.setState({ deleted: true })

        // Notify parent component
        if (this.props.onDeleted) {
            this.props.onDeleted(locationName)
        }
    }

    handleEdit = () => {
        this.setState({ isEditing: true })
    }

    handleCancelEdit = () => {
        this.setState({
            isEditing: false,
            formData: {
                name: this.props.name,
                description: this.props.description,
                address_line1: this.props.address_line1,
                address_line2: this.props.address_line2,
                address_city: this.props.address_city,
                address_country_iso3: this.props.address_country_iso3,
                address_postal_code: this.props.address_postal_code
            },
            error: null
        })
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        this.setState((prevState) => ({
            formData: { ...prevState.formData, [name]: value }
        }))
    }

    validateForm = (): boolean => {
        const { name, address_line1, address_city, address_country_iso3, address_postal_code } = this.state.formData

        if (!name.trim()) {
            this.setState({ error: "Name is required" })
            return false
        }

        if (!address_line1.trim()) {
            this.setState({ error: "Address Line 1 is required" })
            return false
        }

        if (!address_city.trim()) {
            this.setState({ error: "City is required" })
            return false
        }

        if (!address_country_iso3.trim()) {
            this.setState({ error: "Country code is required" })
            return false
        }

        if (address_country_iso3.length !== 3) {
            this.setState({ error: "Country code must be exactly 3 characters (ISO3 format)" })
            return false
        }

        if (!address_postal_code.trim()) {
            this.setState({ error: "Postal code is required" })
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

            // Update props by reloading the page or using a callback
            window.location.reload()
        } catch (err) {
            this.setState({ error: (err as Error).message })
        } finally {
            this.setState({ loading: false })
        }
    }

    handleCardClick = () => {
        this.props.navigate(`/go-heavier/locations/${this.props.id}`)
    }

    render(): React.ReactNode {
        if (this.state.deleted) {
            return null
        }

        if (this.state.isEditing) {
            return (
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
                            {this.state.error && <p className="error-message">{this.state.error}</p>}
                            <div className="form-actions">
                                <button type="submit" disabled={this.state.loading}>
                                    {this.state.loading ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" onClick={this.handleCancelEdit}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
        }

        return (
            <div className="location-container" onClick={this.handleCardClick}>
                <div className="location-main-content">
                    <h2 className="location-title">{this.props.name}</h2>
                    <p className="location-description">
                        {this.props.description} {countryCodeToEmoji(this.props.address_country_iso3.substring(0, 2))}
                    </p>
                </div>
                <div className="location-details">
                    <div className="location-address">
                        <p><strong>Address:</strong></p>
                        <p>{this.props.address_line1}</p>
                        {this.props.address_line2 && <p>{this.props.address_line2}</p>}
                        <p>{this.props.address_city}</p>
                        <p>
                            {this.props.address_postal_code}, {this.props.address_country_iso3}
                        </p>
                    </div>
                </div>
            </div>
        )
    }
}

// Wrapper component to use React Router hooks
function LocationWrapper(props: Omit<Props, 'navigate'>) {
    const navigate = useNavigate()
    return <Location {...props} navigate={navigate} />
}

export default LocationWrapper

