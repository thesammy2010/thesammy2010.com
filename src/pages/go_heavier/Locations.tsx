import React from "react"

import { API_URL } from "../../configs"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import Location from "../../components/go_heavier/Location"
import LocationForm from "../../components/go_heavier/LocationForm"
import "./Locations.css"

interface State {
    configLoaded: boolean | null
    locations?: any[]
    showForm?: boolean
    isRefreshing?: boolean
    hasFetchedOnce?: boolean
}

export default class Locations extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props)
        
        // Try to load cached data from sessionStorage
        const cachedData = sessionStorage.getItem('go-heavier-locations')
        const cachedLocations = cachedData ? JSON.parse(cachedData) : undefined
        
        this.state = {
            configLoaded: cachedLocations ? true : null,
            locations: cachedLocations,
            showForm: false,
            isRefreshing: false,
            hasFetchedOnce: !!cachedLocations
        }
    }

    handleRefresh = async () => {
        this.setState({ isRefreshing: true })
        try {
            const response = await fetch(`${API_URL}/go-heavier/locations`)
            const result = await response.json()
            
            // Cache the data
            sessionStorage.setItem('go-heavier-locations', JSON.stringify(result))
            
            // Wait a bit for the fade animation
            setTimeout(() => {
                this.setState({ 
                    locations: result, 
                    configLoaded: true, 
                    isRefreshing: false,
                    hasFetchedOnce: true 
                })
            }, 300)
        } catch (error) {
            console.error("Error fetching locations:", error)
            this.setState({ configLoaded: false, isRefreshing: false })
        }
    }

    componentDidMount() {
        // Only fetch if we haven't fetched before
        if (!this.state.hasFetchedOnce) {
            this.handleRefresh()
        }
    }

    showLoading() {
        switch (this.state.configLoaded) {
            case true:
                return <></>
            case false:
                return <p className="error-message">Failed to load locations</p>
            default:
                return (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                )
        }
    }

    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    <br />
                {this.state.configLoaded && (
                    <button 
                        onClick={this.handleRefresh} 
                        className={`refresh-arrow-button ${this.state.isRefreshing ? 'spinning' : ''}`}
                        title="Refresh"
                        disabled={this.state.isRefreshing}
                    >
                        ↻
                    </button>
                )}
                <div className="header">
                    {this.showLoading()}
                    {!this.state.configLoaded && this.state.configLoaded !== null && (
                        <button onClick={this.handleRefresh}>Retry</button>
                    )}
                </div>
                {this.state.configLoaded && this.state.locations != null && this.state.locations.length === 0 && (
                    <div className="header">
                        <p>No locations found.</p>
                    </div>
                )}
                {this.state.configLoaded && this.state.locations != null && this.state.locations.length > 0 && (
                    <div className={`locations-grid ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                        {this.state.locations.map((location) => (
                            <Location key={location.id} {...location} />
                        ))}
                    </div>
                )}
                {this.state.configLoaded && (
                    <button 
                        className="add-location-button"
                        onClick={() => {
                            this.setState({ showForm: true })
                        }}
                    >
                        <span className="button-icon">➕</span>
                        Add New Location
                    </button>
                )}
                {this.state.showForm && (
                    <div>
                        <LocationForm
                            onClose={() => {
                                this.setState({ showForm: false })
                            }}
                            onSuccess={(newLocation) => {
                                this.setState((prevState) => ({
                                    locations: [...(prevState.locations ?? []), newLocation]
                                }))
                            }}
                        />
                    </div>
                )}
                </div>
            </div>
        )
    }
}
