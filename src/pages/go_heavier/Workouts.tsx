import React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import WorkoutForm from "../../components/go_heavier/WorkoutForm"
import { API_URL, WORKOUTS_CACHE_KEY, formatNotes } from "../../configs"
import "../GoHeavier.css"
import "./Workouts.css"

interface WorkoutData {
    id: string
    location_id: string
    exercise_id: string
    exercise_index: number
    workout_time: string
    index: number
    repetitions: number
    weight_kg: number
    bar_weight_kg: number
    supplementary_weight_kg: number
    notes: string
    created_at: string
    updated_at: string
}

// Safety cap on the page walk so a misbehaving endpoint can't loop forever.
const MAX_WORKOUT_PAGES = 500

// Pagination is offset-based, so a page can overlap another when rows are
// inserted between requests. Always merge on id rather than concatenating.
const mergeById = (existing: WorkoutData[], incoming: WorkoutData[]): WorkoutData[] => {
    const seen = new Set(existing.map(workout => workout.id))
    return [...existing, ...incoming.filter(workout => !seen.has(workout.id))]
}

const dedupeById = (workouts: WorkoutData[]): WorkoutData[] => mergeById([], workouts)

interface State {
    configLoaded: boolean | null
    workouts?: WorkoutData[]
    locations?: any[]
    exercises?: any[]
    showForm?: boolean
    isRefreshing?: boolean
    toast?: {
        message: string
        type: 'success' | 'error' | 'info'
    } | null
    hasFetchedOnce?: boolean
    showDateFilter?: boolean
    showExerciseFilter?: boolean
    showLocationFilter?: boolean
    dateFilter: {
        startDate: string
        endDate: string
    }
    filters: {
        exerciseIds: string[]
        locationIds: string[]
    }
}

interface WorkoutsProps {
    searchParams: URLSearchParams
    setSearchParams: (params: URLSearchParams) => void
    navigate: (path: string) => void
}

export class Workouts extends React.Component<WorkoutsProps, State> {
    private tableContainerRef: React.RefObject<HTMLDivElement>

    constructor(props: WorkoutsProps) {
        super(props)
        
        const cachedData = localStorage.getItem(WORKOUTS_CACHE_KEY)
        const cachedWorkouts = cachedData ? dedupeById(JSON.parse(cachedData)) : undefined
        
        // Read filters from URL
        const startDate = props.searchParams.get('startDate') || ''
        const endDate = props.searchParams.get('endDate') || ''
        const exerciseIds = props.searchParams.get('exercises')?.split(',').filter(id => id) || []
        const locationIds = props.searchParams.get('locations')?.split(',').filter(id => id) || []
        
        this.tableContainerRef = React.createRef()
        
        this.state = {
            configLoaded: cachedWorkouts ? true : null,
            workouts: cachedWorkouts,
            locations: [],
            exercises: [],
            showForm: false,
            isRefreshing: false,
            toast: null,
            hasFetchedOnce: !!cachedWorkouts,
            showDateFilter: false,
            showExerciseFilter: false,
            showLocationFilter: false,
            dateFilter: {
                startDate,
                endDate
            },
            filters: {
                exerciseIds,
                locationIds
            }
        }
    }

    showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        this.setState({ toast: { message, type } })
        setTimeout(() => {
            this.setState({ toast: null })
        }, 3000)
    }

    // The API pages its results, so walk pages until one comes back empty.
    fetchAllWorkouts = async (): Promise<WorkoutData[]> => {
        const all: WorkoutData[] = []

        for (let page = 1; page <= MAX_WORKOUT_PAGES; page++) {
            const response = await fetch(`${API_URL}/go-heavier/workouts?page=${page}`)
            const pageWorkouts: WorkoutData[] = await response.json()

            if (pageWorkouts.length === 0) {
                break
            }
            all.push(...pageWorkouts)
        }

        return dedupeById(all)
    }

    fetchWorkouts = async (minDuration: number = 300) => {
        const startedAt = Date.now()
        const waitOut = () => new Promise<void>(resolve =>
            setTimeout(resolve, Math.max(0, minDuration - (Date.now() - startedAt)))
        )

        this.setState({ isRefreshing: true })
        try {
            const [workouts, locationsRes, exercisesRes] = await Promise.all([
                this.fetchAllWorkouts(),
                fetch(`${API_URL}/go-heavier/locations`),
                fetch(`${API_URL}/go-heavier/exercises`)
            ])
            
            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()
            
            localStorage.setItem(WORKOUTS_CACHE_KEY, JSON.stringify(workouts))
            
            await waitOut()
            this.setState({ 
                workouts, 
                locations,
                exercises,
                configLoaded: true, 
                isRefreshing: false,
                hasFetchedOnce: true
            })
        } catch (error) {
            console.error("Error fetching workouts:", error)
            await waitOut()
            this.setState({ configLoaded: false, isRefreshing: false })
        }
    }

    handleRefresh = () => {
        this.fetchWorkouts()
    }

    handleRetry = () => {
        // Keep the loading state on screen long enough to be visible
        this.fetchWorkouts(1000)
    }

    componentDidMount() {
        if (!this.state.hasFetchedOnce) {
            this.handleRefresh()
        } else {
            // If workouts are cached, still need to fetch locations and exercises for name lookup
            this.fetchLocationsAndExercises()
        }
    }

    fetchLocationsAndExercises = async () => {
        try {
            const [locationsRes, exercisesRes] = await Promise.all([
                fetch(`${API_URL}/go-heavier/locations`),
                fetch(`${API_URL}/go-heavier/exercises`)
            ])
            
            const locations = await locationsRes.json()
            const exercises = await exercisesRes.json()
            
            this.setState({ locations, exercises })
        } catch (error) {
            console.error("Error fetching locations/exercises:", error)
        }
    }

    getLocationName = (locationId: string): string => {
        const location = this.state.locations?.find(l => l.id === locationId)
        return location ? location.name : 'Unknown Location'
    }

    getExerciseName = (exerciseId: string): string => {
        const exercise = this.state.exercises?.find(e => e.id === exerciseId)
        return exercise ? exercise.name : 'Unknown Exercise'
    }

    formatDateTime = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })
    }

    handleDateFilterChange = (field: 'startDate' | 'endDate', value: string) => {
        const newFilter = {
            ...this.state.dateFilter,
            [field]: value
        }
        
        this.setState({
            dateFilter: newFilter
        })
        
        // Update URL
        this.updateURLParams(newFilter, this.state.filters)
    }

    clearDateFilter = () => {
        const newFilter = {
            startDate: '',
            endDate: ''
        }
        
        this.setState({
            dateFilter: newFilter,
            showDateFilter: false
        })
        
        // Update URL but preserve other filters
        this.updateURLParams(newFilter, this.state.filters)
    }

    toggleExerciseFilter = (exerciseId: string) => {
        const newExerciseIds = this.state.filters.exerciseIds.includes(exerciseId)
            ? this.state.filters.exerciseIds.filter(id => id !== exerciseId)
            : [...this.state.filters.exerciseIds, exerciseId]
        
        const newFilters = {
            ...this.state.filters,
            exerciseIds: newExerciseIds
        }
        
        this.setState({ 
            filters: newFilters
        })
        this.updateURLParams(this.state.dateFilter, newFilters)
    }

    toggleLocationFilter = (locationId: string) => {
        const newLocationIds = this.state.filters.locationIds.includes(locationId)
            ? this.state.filters.locationIds.filter(id => id !== locationId)
            : [...this.state.filters.locationIds, locationId]
        
        const newFilters = {
            ...this.state.filters,
            locationIds: newLocationIds
        }
        
        this.setState({ 
            filters: newFilters
        })
        this.updateURLParams(this.state.dateFilter, newFilters)
    }

    clearAllFilters = () => {
        this.setState({
            dateFilter: { startDate: '', endDate: '' },
            filters: { exerciseIds: [], locationIds: [] },
            showDateFilter: false,
            showExerciseFilter: false,
            showLocationFilter: false
        })
        this.props.setSearchParams(new URLSearchParams())
    }

    updateURLParams = (dateFilter: { startDate: string, endDate: string }, filters: { exerciseIds: string[], locationIds: string[] }) => {
        const params = new URLSearchParams()
        
        if (dateFilter.startDate) {
            params.set('startDate', dateFilter.startDate)
        }
        
        if (dateFilter.endDate) {
            params.set('endDate', dateFilter.endDate)
        }
        
        if (filters.exerciseIds.length > 0) {
            params.set('exercises', filters.exerciseIds.join(','))
        }
        
        if (filters.locationIds.length > 0) {
            params.set('locations', filters.locationIds.join(','))
        }
        
        this.props.setSearchParams(params)
    }

    getFilteredWorkouts = (): WorkoutData[] => {
        if (!this.state.workouts) return []

        let filtered = [...this.state.workouts]

        // Apply date filter if set
        if (this.state.dateFilter.startDate || this.state.dateFilter.endDate) {
            filtered = filtered.filter(workout => {
                // Parse workout time - handle both ISO string and other formats
                const workoutDate = new Date(workout.workout_time)
                
                // Reset time to start of day for comparison
                const workoutDateOnly = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate())
                
                if (this.state.dateFilter.startDate) {
                    const startDate = new Date(this.state.dateFilter.startDate)
                    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
                    if (workoutDateOnly < startDateOnly) return false
                }
                
                if (this.state.dateFilter.endDate) {
                    const endDate = new Date(this.state.dateFilter.endDate)
                    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
                    if (workoutDateOnly > endDateOnly) return false
                }
                
                return true
            })
        }

        // Apply exercise filter
        if (this.state.filters.exerciseIds.length > 0) {
            filtered = filtered.filter(workout => 
                this.state.filters.exerciseIds.includes(workout.exercise_id)
            )
        }

        // Apply location filter
        if (this.state.filters.locationIds.length > 0) {
            filtered = filtered.filter(workout => 
                this.state.filters.locationIds.includes(workout.location_id)
            )
        }

        return filtered
    }

    showLoading() {
        switch (this.state.configLoaded) {
            case true:
                return <></>
            case false:
                return <></>
            default:
                return (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                )
        }
    }

    render(): React.ReactNode {
        const filteredWorkouts = this.getFilteredWorkouts()
        const hasDateFilter = this.state.dateFilter.startDate || this.state.dateFilter.endDate
        const hasExerciseFilter = this.state.filters.exerciseIds.length > 0
        const hasLocationFilter = this.state.filters.locationIds.length > 0
        const hasAnyFilter = hasDateFilter || hasExerciseFilter || hasLocationFilter

        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
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
                    </div>

                    {this.state.configLoaded === false && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Workouts</h2>
                            <p className="error-message">Unable to fetch workouts from server</p>
                            <button onClick={this.handleRetry} disabled={this.state.isRefreshing}>
                                {this.state.isRefreshing ? (
                                    <>
                                        <span className="button-spinner"></span>
                                        Retrying...
                                    </>
                                ) : 'Retry'}
                            </button>
                        </div>
                    )}

                    {this.state.configLoaded && this.state.workouts != null && filteredWorkouts.length === 0 && (
                        <div className="header">
                            <p>{hasAnyFilter ? 'No workouts found matching the filters.' : 'No workouts found.'}</p>
                        </div>
                    )}
                    {this.state.configLoaded && this.state.workouts != null && this.state.workouts.length > 0 && (
                        <div className={`workouts-table-container ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="results-summary">
                                <span className="results-count">
                                    📊 Showing <strong>{filteredWorkouts.length}</strong> of <strong>{this.state.workouts.length}</strong> workouts
                                </span>
                            </div>
                            
                            {hasAnyFilter && (
                                <div className="date-filter-active">
                                    <span>
                                        📅 Filters Active: 
                                        {hasDateFilter && ` Date (${this.state.dateFilter.startDate ? new Date(this.state.dateFilter.startDate).toLocaleDateString() : 'Start'} → ${this.state.dateFilter.endDate ? new Date(this.state.dateFilter.endDate).toLocaleDateString() : 'End'})`}
                                        {hasExerciseFilter && ` • ${this.state.filters.exerciseIds.length} Exercise${this.state.filters.exerciseIds.length > 1 ? 's' : ''}`}
                                        {hasLocationFilter && ` • ${this.state.filters.locationIds.length} Location${this.state.filters.locationIds.length > 1 ? 's' : ''}`}
                                    </span>
                                    <button className="clear-date-filter" onClick={this.clearAllFilters}>
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                            <table className="workouts-table">
                                <thead>
                                    <tr>
                                        <th 
                                            className="date-column-header"
                                            onClick={() => this.setState({ showDateFilter: !this.state.showDateFilter })}
                                        >
                                            Date & Time {this.state.showDateFilter ? '▼' : '▶'}
                                        </th>
                                        <th 
                                            className="date-column-header"
                                            onClick={() => this.setState({ showExerciseFilter: !this.state.showExerciseFilter })}
                                        >
                                            Exercise {this.state.showExerciseFilter ? '▼' : '▶'}
                                            {hasExerciseFilter && <span className="filter-active-dot"></span>}
                                        </th>
                                        <th 
                                            className="date-column-header"
                                            onClick={() => this.setState({ showLocationFilter: !this.state.showLocationFilter })}
                                        >
                                            Location {this.state.showLocationFilter ? '▼' : '▶'}
                                            {hasLocationFilter && <span className="filter-active-dot"></span>}
                                        </th>
                                        <th>Set #</th>
                                        <th>Reps</th>
                                        <th>Weight (kg)</th>
                                        <th>Bar (kg)</th>
                                        <th>Supp. (kg)</th>
                                        <th>Total (kg)</th>
                                        <th>Notes</th>
                                    </tr>
                                    {(this.state.showDateFilter || this.state.showExerciseFilter || this.state.showLocationFilter) && (
                                        <tr className="date-filter-row">
                                            <td colSpan={10}>
                                                <div className="inline-filter-container">
                                                    {this.state.showDateFilter && (
                                                        <div className="inline-filter-section">
                                                            <h4>📅 Date Range</h4>
                                                            <div className="date-filter-inputs">
                                                                <label>
                                                                    <span>From:</span>
                                                                    <input
                                                                        type="date"
                                                                        value={this.state.dateFilter.startDate}
                                                                        onChange={(e) => this.handleDateFilterChange('startDate', e.target.value)}
                                                                    />
                                                                </label>
                                                                <label>
                                                                    <span>To:</span>
                                                                    <input
                                                                        type="date"
                                                                        value={this.state.dateFilter.endDate}
                                                                        onChange={(e) => this.handleDateFilterChange('endDate', e.target.value)}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {this.state.showExerciseFilter && (
                                                        <div className="inline-filter-section">
                                                            <h4>🏋️ Exercises</h4>
                                                            <div className="filter-checkboxes-inline">
                                                                {this.state.exercises?.map(exercise => (
                                                                    <label key={exercise.id} className="filter-checkbox-label">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={this.state.filters.exerciseIds.includes(exercise.id)}
                                                                            onChange={() => this.toggleExerciseFilter(exercise.id)}
                                                                        />
                                                                        <span>{exercise.name}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {this.state.showLocationFilter && (
                                                        <div className="inline-filter-section">
                                                            <h4>📍 Locations</h4>
                                                            <div className="filter-checkboxes-inline">
                                                                {this.state.locations?.map(location => (
                                                                    <label key={location.id} className="filter-checkbox-label">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={this.state.filters.locationIds.includes(location.id)}
                                                                            onChange={() => this.toggleLocationFilter(location.id)}
                                                                        />
                                                                        <span>{location.name}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {filteredWorkouts.map((workout) => {
                                        const totalWeight = workout.weight_kg + 
                                                          (workout.bar_weight_kg || 0) + 
                                                          (workout.supplementary_weight_kg || 0)
                                        
                                        return (
                                            <tr key={workout.id}>
                                                <td className="workout-time">
                                                    {this.formatDateTime(workout.workout_time)}
                                                </td>
                                                <td className="workout-exercise">
                                                    <a 
                                                        href={`/go-heavier/exercises/${workout.exercise_id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            this.props.navigate(`/go-heavier/exercises/${workout.exercise_id}`)
                                                        }}
                                                        className="table-link"
                                                    >
                                                        {this.getExerciseName(workout.exercise_id)}
                                                    </a>
                                                </td>
                                                <td className="workout-location">
                                                    <a 
                                                        href={`/go-heavier/locations/${workout.location_id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            this.props.navigate(`/go-heavier/locations/${workout.location_id}`)
                                                        }}
                                                        className="table-link"
                                                    >
                                                        {this.getLocationName(workout.location_id)}
                                                    </a>
                                                </td>
                                                <td className="workout-set">
                                                    {workout.index}
                                                </td>
                                                <td className="workout-reps">
                                                    {workout.repetitions}
                                                </td>
                                                <td className="workout-weight">
                                                    {workout.weight_kg.toFixed(1)}
                                                </td>
                                                <td className="workout-bar">
                                                    {workout.bar_weight_kg ? workout.bar_weight_kg.toFixed(1) : '-'}
                                                </td>
                                                <td className="workout-supp">
                                                    {workout.supplementary_weight_kg ? workout.supplementary_weight_kg.toFixed(1) : '-'}
                                                </td>
                                                <td className="workout-total">
                                                    <strong>{totalWeight.toFixed(1)}</strong>
                                                </td>
                                                <td className="workout-notes">
                                                    {formatNotes(workout.notes)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
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
                            Add New Workout
                        </button>
                    )}
                    {this.state.showForm && (
                        <div>
                            <WorkoutForm
                                onClose={() => {
                                    this.setState({ showForm: false })
                                }}
                                onSuccess={() => {
                                    // handleRefresh below repopulates from page 1,
                                    // which already includes the new workout.
                                    localStorage.removeItem(WORKOUTS_CACHE_KEY)
                                    this.setState({ showForm: false })
                                    this.showToast("Workout created successfully", 'success')
                                    this.handleRefresh()
                                }}
                            />
                        </div>
                    )}
                    {this.state.toast && (
                        <div className={`toast toast-${this.state.toast.type}`}>
                            {this.state.toast.message}
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

// Wrapper component to provide URL search params
export default function WorkoutsWithParams() {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    return <Workouts searchParams={searchParams} setSearchParams={setSearchParams} navigate={navigate} />
}
