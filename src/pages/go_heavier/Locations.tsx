import React from "react"

import { API_URL, ApiError, LOCATIONS_CACHE_KEY, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { clearCache, isArray, isStale, readCache, writeCache } from "../../cache"
import { canAccess, isSignedIn, subscribeAccess, subscribeAccessReady } from "../../roles"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import Location from "../../components/go_heavier/Location"
import LocationForm from "../../components/go_heavier/LocationForm"
import SignInPrompt from "../../components/SignInPrompt"
import "../GoHeavier.css"
import "./Locations.css"

interface State {
    configLoaded: boolean | null
    loadError: string | null
    locations?: any[]
    showForm?: boolean
    isRefreshing?: boolean
    hasFetchedOnce?: boolean
    // Whether what we started from was old enough to be worth revalidating.
    cacheIsStale?: boolean
}

export default class Locations extends React.Component<{}, State> {
    unsubscribeAccess?: () => void
    unsubscribeReady?: () => void

    constructor(props: {}) {
        super(props)
        
        // Cached locations render immediately; autoFetch decides whether
        // they're old enough to also be revalidated in the background.
        const cached = readCache<any[]>(LOCATIONS_CACHE_KEY, isArray)
        const cachedLocations = cached?.data

        this.state = {
            configLoaded: cachedLocations ? true : null,
            loadError: null,
            locations: cachedLocations,
            showForm: false,
            isRefreshing: false,
            hasFetchedOnce: !!cachedLocations,
            cacheIsStale: isStale(cached)
        }
    }

    // `quiet` is the background revalidate: same request, but it leaves the
    // spinner alone and swallows failures, because there are already
    // locations on screen and nobody asked for this. A visible error there
    // would replace a working page with a complaint about a request the
    // reader never made.
    fetchLocations = async (quiet: boolean = false) => {
        if (!quiet) {
            this.setState({ isRefreshing: true })
        }
        try {
            const response = await apiFetch(`${API_URL}/go-heavier/locations`)
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to load locations")
            }
            const result = await response.json()

            writeCache(LOCATIONS_CACHE_KEY, result)

            const apply = () => this.setState({
                locations: result,
                configLoaded: true,
                loadError: null,
                isRefreshing: false,
                hasFetchedOnce: true,
                cacheIsStale: false
            })

            if (quiet) {
                apply()
            } else {
                // Wait a bit for the fade animation
                setTimeout(apply, 300)
            }
        } catch (error) {
            console.error("Error fetching locations:", error)
            if (quiet) {
                return
            }
            this.setState({ configLoaded: false, loadError: (error as Error).message, isRefreshing: false })
        }
    }

    // Pressing refresh is a request for current data, so the cached copy is
    // dropped before the fetch rather than overwritten after it - nothing
    // stale survives the click, even if the request then fails.
    handleRefresh = async () => {
        clearCache(LOCATIONS_CACHE_KEY)
        await this.fetchLocations()
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
            // Already showing cached locations. Only go back to the API if
            // they've aged past the point of being worth a request, and do
            // it quietly so the list doesn't flicker.
            if (this.state.cacheIsStale) {
                this.fetchLocations(true)
            }
            return
        }
        this.fetchLocations()
    }

    componentDidMount() {
        // Not just a re-render: signing in (or an admin changing your role)
        // fires this too, and without retrying autoFetch here, someone who
        // signs in from the "sign in to continue" prompt on this exact page
        // would see nothing happen - the one-time subscribeAccessReady
        // callback already fired, showing that prompt, before they signed in.
        // autoFetch's own hasFetchedOnce guard keeps this from refetching
        // once already loaded.
        this.unsubscribeAccess = subscribeAccess(() => {
            this.forceUpdate()
            this.autoFetch()
        })
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
                {this.state.configLoaded === false && !isSignedIn() && (
                    <SignInPrompt message="Sign in to view locations." />
                )}
                {this.state.configLoaded === false && isSignedIn() && (
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
