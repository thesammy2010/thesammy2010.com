import React from "react"

import "./Location.css"
import { countryCodeToEmoji } from "../../configs"
import { useNavigate } from "react-router-dom"

interface Props {
    id: string
    name: string
    description: string
    address_line1: string
    address_line2: string
    address_city: string
    address_country_iso3: string
    address_postal_code: string
    logo_url?: string
    navigate: (path: string) => void
}

// A card in the locations list. Editing and deleting live on the detail page.
export class Location extends React.Component<Props> {
    handleCardClick = () => {
        this.props.navigate(`/go-heavier/locations/${this.props.id}`)
    }

    render(): React.ReactNode {
        return (
            <div className="location-container" onClick={this.handleCardClick}>
                {this.props.logo_url && (
                    <div className="location-logo">
                        <img src={this.props.logo_url} alt={`${this.props.name} logo`} />
                    </div>
                )}
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
