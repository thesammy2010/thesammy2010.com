import React from "react"

import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { canAccess, subscribeAccess, subscribeAccessReady } from "../../roles"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import Location from "../../components/go_heavier/Location"
import LocationForm from "../../components/go_heavier/LocationForm"
import "../GoHeavier.css"
import "./Locations.css"

interface State {
    configLoaded: boolean | null
    loadError: string | null
    locations?: any[]
    showForm?: boolean
    isRefreshing?: boolean
    hasFetchedOnce?: boolean
}

export default class Locations extends React.Component<{}, State> {
    unsubscribeAccess?: () => void
    unsubscribeReady?: () => void

    constructor(props: {}) {
        super(props)
        
        // Try to load cached data from sessionStorage. Guards against a
        // cache written before an error response (e.g. a 403 body) was
        // excluded from what gets cached - an old entry like that would
        // otherwise be trusted as the location list forever, since it's
        // truthy and never re-fetched.
        const cachedData = sessionStorage.getItem('go-heavier-locations')
        const parsedLocations = cachedData ? JSON.parse(cachedData) : undefined
        const cachedLocations = Array.isArray(parsedLocations) ? parsedLocations : undefined
        
        this.state = {
            configLoaded: cachedLocations ? true : null,
            loadError: null,
            locations: cachedLocations,
            showForm: false,
            isRefreshing: false,
            hasFetchedOnce: !!cachedLocations
        }
    }

    handleRefresh = async () => {
        this.setState({ isRefreshing: true })
        try {
            const response = await apiFetch(`${API_URL}/go-heavier/locations`)
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to load locations")
            }
            const result = await response.json()

            // Cache the data
            sessionStorage.setItem('go-heavier-locations', JSON.stringify(result))

            // Wait a bit for the fade animation
            setTimeout(() => {
                this.setState({
                    locations: result,
                    configLoaded: true,
                    loadError: null,
                    isRefreshing: false,
                    hasFetchedOnce: true
                })
            }, 300)
        } catch (error) {
            console.error("Error fetching locations:", error)
            this.setState({ configLoaded: false, loadError: (error as Error).message, isRefreshing: false })
        }
    }

    // Only skips the very first, automatic load - the refresh/retry buttons
    // call handleRefresh directly and always hit the API, since clicking one
    // is an explicit request that's worth trying even if we think it'll fail.
    autoFetch = () => {
        // Checked before the cache: an empty (but validly cached) list looks
        // exactly like "already loaded, nothing to show" and would otherwise
        // keep being trusted after a role change revoked access, silently
        // masking the permission problem behind "No locations found."
        if (!canAccess("GET", "/go-heavier/locations")) {
            this.setState({ configLoaded: false, loadError: PERMISSION_DENIED_MESSAGE })
            return
        }
        if (this.state.hasFetchedOnce) {
            return
        }
        this.handleRefresh()
    }

    componentDidMount() {
        this.unsubscribeAccess = subscribeAccess(() => this.forceUpdate())
        this.unsubscribeReady = subscribeAccessReady(this.autoFetch)
    }

    componentWillUnmount() {
        this.unsubscribeAccess?.()
        this.unsubscribeReady?.()
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
                {this.state.configLoaded === null && (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                )}
                {this.state.configLoaded === false && (
                    <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                        <h2>Failed to Load Locations</h2>
                        <p className="error-message">
                            {this.state.loadError ?? "Failed to load locations"}
                        </p>
                        <button onClick={this.handleRefresh} disabled={this.state.isRefreshing}>
                            {this.state.isRefreshing ? (
                                <>
                                    <span className="button-spinner"></span>
                                    Retrying...
                                </>
                            ) : 'Retry'}
                        </button>
                    </div>
                )}
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
                {this.state.configLoaded && canAccess("POST", "/go-heavier/locations") && (
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
