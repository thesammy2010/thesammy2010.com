import React from "react"

import "./Location.css"
import { API_URL, countryCodeToEmoji } from "../../configs"

interface State {
    loaded: boolean
    deleted: boolean
}

interface Props {
    id: string
    name: string
    description: string
    address_line1: string
    address_line2: string
    address_country_iso3: string
    address_postal_code: string
    created_at: string
    updated_at: string
}

export default class Location extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            loaded: true,
            deleted: false
        }
    }

    handleDelete = async () => {
        await fetch(`${API_URL}/go-heavier/locations/${this.props.id}`, {
            method: "DELETE"
        })
        this.setState({ deleted: true })
    }

    render(): React.ReactNode {
        return (
            !this.state.deleted && (
                <div className="location-container">
                    <button className="delete-button" onClick={this.handleDelete}>
                        ✖<span className="delete-tooltip">Delete</span>
                    </button>
                    <h2 className="location-title">{this.props.name}</h2>
                    <p className="location-description">
                        {this.props.description} {countryCodeToEmoji(this.props.address_country_iso3.substring(0, 2))}
                    </p>
                    {/* Add these to a more detailed page*/}

                    {/* <div className="location-address">
                        <p>{this.props.address_line1}</p>
                        {this.props.address_line2 && <p>{this.props.address_line2}</p>}
                        <p>
                            <b>{this.props.address_postal_code}</b>, {this.props.address_country_iso3}
                        </p>
                    </div>
                    <div className="location-timestamps">
                        <p>Created At: {new Date(this.props.created_at).toLocaleString()}</p>
                        <p>Updated At: {new Date(this.props.updated_at).toLocaleString()}</p>
                    </div> */}
                </div>
            )
        )
    }
}
