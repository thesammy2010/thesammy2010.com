import React, { useState } from "react"
import "./LocationForm.css"

import { API_URL } from "../../configs"

interface LocationFormProps {
    onClose: () => void // Function to close the popup
    onSuccess: (newLocation: object) => void // Callback for successful creation
}

// const LocationForm: React.FC<LocationFormProps> = ({ onClose, onSuccess }) => {
//     const [formData, setFormData] = useState({
//         name: "",
//         description: "",
//         address_line1: "",
//         address_line2: "",
//         address_country_iso3: "",
//         address_postal_code: ""
//     })

//     const [loading, setLoading] = useState(false)
//     const [error, setError] = useState<string | null>(null)

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         const { name, value } = e.target
//         setFormData((prev) => ({ ...prev, [name]: value }))
//     }

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault()
//         setLoading(true)
//         setError(null)

//         try {
//             const response = await fetch(`${API_URL}/go-heavier/locations`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json"
//                 },
//                 body: JSON.stringify(formData)
//             })

//             if (!response.ok) {
//                 throw new Error("Failed to create location")
//             }

//             const newLocation = await response.json()

//             onSuccess(newLocation) // Notify parent of success
//             onClose() // Close the popup
//         } catch (err) {
//             setError((err as Error).message)
//         } finally {
//             setLoading(false)
//         }
//     }

//     return (
//         <div className="popup-overlay">
//             <div className="popup-form">
//                 <h2>Create New Location</h2>
//                 <form onSubmit={handleSubmit}>
//                     <label>
//                         Name:
//                         <input type="text" name="name" value={formData.name} onChange={handleChange} required />
//                     </label>
//                     <label>
//                         Description:
//                         <textarea name="description" value={formData.description} onChange={handleChange} />
//                     </label>
//                     <label>
//                         Address Line 1:
//                         <input
//                             type="text"
//                             name="address_line1"
//                             value={formData.address_line1}
//                             onChange={handleChange}
//                             required
//                         />
//                     </label>
//                     <label>
//                         Address Line 2:
//                         <input
//                             type="text"
//                             name="address_line2"
//                             value={formData.address_line2}
//                             onChange={handleChange}
//                         />
//                     </label>
//                     <label>
//                         Country (ISO3):
//                         <input
//                             type="text"
//                             name="address_country_iso3"
//                             value={formData.address_country_iso3}
//                             onChange={handleChange}
//                             required
//                         />
//                     </label>
//                     <label>
//                         Postal Code:
//                         <input
//                             type="text"
//                             name="address_postal_code"
//                             value={formData.address_postal_code}
//                             onChange={handleChange}
//                             required
//                         />
//                     </label>
//                     {error && <p className="error-message">{error}</p>}
//                     <div className="form-actions">
//                         <button type="submit" disabled={loading}>
//                             {loading ? "Creating..." : "Create"}
//                         </button>
//                         <button type="button" onClick={onClose}>
//                             Cancel
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     )
// }

interface LocationFormProps {
    onClose: () => void // Function to close the popup
    onSuccess: (newLocation: object) => void // Callback for successful creation
}

interface LocationFormState {
    formData: {
        name: string
        description: string
        address_line1: string
        address_line2: string
        address_country_iso3: string
        address_postal_code: string
    }
    loading: boolean
    error: string | null
}

export default class LocationForm extends React.Component<LocationFormProps, LocationFormState> {
    constructor(props: LocationFormProps) {
        super(props)
        this.state = {
            formData: {
                name: "",
                description: "",
                address_line1: "",
                address_line2: "",
                address_country_iso3: "",
                address_postal_code: ""
            },
            loading: false,
            error: null
        }
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        this.setState((prevState) => ({
            formData: { ...prevState.formData, [name]: value }
        }))
    }

    handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        this.setState({ loading: true, error: null })

        try {
            const response = await fetch(`${API_URL}/go-heavier/locations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(this.state.formData)
            })

            if (!response.ok) {
                throw new Error("Failed to create location")
            }

            const newLocation = await response.json()

            this.props.onSuccess(newLocation) // Notify parent of success
            this.props.onClose() // Close the popup
        } catch (err) {
            this.setState({ error: (err as Error).message })
        } finally {
            this.setState({ loading: false })
        }
    }

    render() {
        const { formData, loading, error } = this.state

        return (
            <div className="popup-overlay">
                <div className="popup-form">
                    <button className="close-button" onClick={this.props.onClose}>
                        ✖
                    </button>
                    <h2>Create New Location</h2>
                    <form onSubmit={this.handleSubmit}>
                        <label>
                            Name:
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
                            <textarea name="description" value={formData.description} onChange={this.handleChange} />
                        </label>
                        <label>
                            Address Line 1:
                            <input
                                type="text"
                                name="address_line1"
                                value={formData.address_line1}
                                onChange={this.handleChange}
                                required
                            />
                        </label>
                        <label>
                            Address Line 2:
                            <input
                                type="text"
                                name="address_line2"
                                value={formData.address_line2}
                                onChange={this.handleChange}
                            />
                        </label>
                        <label>
                            Country (ISO3):
                            <input
                                type="text"
                                name="address_country_iso3"
                                value={formData.address_country_iso3}
                                onChange={this.handleChange}
                                required
                            />
                        </label>
                        <label>
                            Postal Code:
                            <input
                                type="text"
                                name="address_postal_code"
                                value={formData.address_postal_code}
                                onChange={this.handleChange}
                                required
                            />
                        </label>
                        {error && <p className="error-message">{error}</p>}
                        <div className="form-actions">
                            <button type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create"}
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

// export default LocationForm
