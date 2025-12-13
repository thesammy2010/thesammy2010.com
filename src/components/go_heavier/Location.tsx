import React from "react"

interface State {
    loaded: boolean
}

interface Props {
    id: string
    name: string
    description: string
    address_line1: string
    address_line2: string
    address_country_iso3: string
    address_postcode: string
    created_at: string
    updated_at: string
}

export default class Location extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            loaded: false
        }
    }

    render(): React.ReactNode {
        return (
            <div className="location-container">
                <h2 className="location-title">{this.props.name}</h2>
                <p className="location-description">{this.props.description}</p>
                <div className="location-address">
                    <p>{this.props.address_line1}</p>
                    {this.props.address_line2 && <p>{this.props.address_line2}</p>}
                    <p>
                        {this.props.address_postcode}, {this.props.address_country_iso3}
                    </p>
                </div>
                <div className="location-timestamps">
                    <p>Created At: {new Date(this.props.created_at).toLocaleString()}</p>
                    <p>Updated At: {new Date(this.props.updated_at).toLocaleString()}</p>
                </div>
            </div>
        )
    }
}
