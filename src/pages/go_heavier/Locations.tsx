import React from "react"

import { API_URL } from "../../configs"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import Location from "../../components/go_heavier/Location"
import LocationForm from "../../components/go_heavier/LocationForm"

interface State {
    configLoaded: boolean | null
    locations?: any[]
    showForm?: boolean
}

export default class Locations extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props)
        this.state = {
            configLoaded: null,
            showForm: false
        }
    }

    fetchConfig = async () => {
        this.setState({ configLoaded: null })
        try {
            const response = await fetch(`${API_URL}/go-heavier/locations`)
            const result = await response.json()
            this.setState({ locations: result, configLoaded: true })
        } catch (error) {
            console.error("Error fetching locations:", error)
            this.setState({ configLoaded: false })
        }
    }

    componentDidMount() {
        this.fetchConfig()
    }

    showLoading() {
        switch (this.state.configLoaded) {
            case true:
                return <></>
            case false:
                return <p>failed to load locations</p>
            default:
                return <p>loading...</p>
        }
    }

    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <br />
                <div className="header">
                    <h2>Locations</h2>
                </div>
                <div className="header">
                    {this.showLoading()}
                    {!this.state.configLoaded && <button onClick={this.fetchConfig}>Load Locations</button>}
                    {this.state.configLoaded && (
                        <button onClick={this.fetchConfig} className="refresh-button">
                            Refresh
                        </button>
                    )}
                    {this.state.configLoaded &&
                        this.state.locations != null &&
                        this.state.locations.map((location) => <Location {...location} />)}
                    {this.state.configLoaded && this.state.locations != null && this.state.locations.length === 0 && (
                        <p>No locations found.</p>
                    )}
                </div>
                <div className="header">
                    <button
                        onClick={() => {
                            this.setState({ showForm: true })
                        }}
                    >
                        Add Location
                    </button>
                </div>
                {this.state.showForm && (
                    <div>
                        <LocationForm
                            onClose={() => {
                                this.setState({ showForm: false })
                            }}
                            onSuccess={(newLocation) => {
                                this.state.locations?.push(newLocation)
                                // this.setState({ locations: this.state.locations?.push(newLocation) })
                            }}
                        />
                    </div>
                )}
            </div>
        )
    }
}
