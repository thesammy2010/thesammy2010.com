import React from "react"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import Exercise from "../../components/go_heavier/Exercise"
import ExerciseForm from "../../components/go_heavier/ExerciseForm"
import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { canAccess, subscribeAccess, subscribeAccessReady } from "../../roles"
import "../GoHeavier.css"
import "./Exercises.css"

interface State {
    configLoaded: boolean | null
    loadError: string | null
    exercises?: any[]
    showForm?: boolean
    isRefreshing?: boolean
    toast?: {
        message: string
        type: 'success' | 'error' | 'info'
    } | null
    hasFetchedOnce?: boolean
    showFilters?: boolean
    filters: {
        muscleGroups: string[]
        specificMuscles: string[]
        types: string[] // 'unilateral', 'bilateral'
        equipments: string[] // 'free_weights', 'machine'
    }
}

export default class Exercises extends React.Component<{}, State> {
    unsubscribeAccess?: () => void
    unsubscribeReady?: () => void

    constructor(props: {}) {
        super(props)
        
        // Guards against a cache written before an error response (e.g. a
        // 403 body) was excluded from what gets cached - an old entry like
        // that would otherwise be trusted as the exercise list forever,
        // since it's truthy and never re-fetched.
        const cachedData = sessionStorage.getItem('go-heavier-exercises')
        const parsedExercises = cachedData ? JSON.parse(cachedData) : undefined
        const cachedExercises = Array.isArray(parsedExercises) ? parsedExercises : undefined
        
        this.state = {
            configLoaded: cachedExercises ? true : null,
            loadError: null,
            exercises: cachedExercises,
            showForm: false,
            isRefreshing: false,
            toast: null,
            hasFetchedOnce: !!cachedExercises,
            showFilters: false,
            filters: {
                muscleGroups: [],
                specificMuscles: [],
                types: [],
                equipments: []
            }
        }
    }

    showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        this.setState({ toast: { message, type } })
        setTimeout(() => {
            this.setState({ toast: null })
        }, 3000)
    }

    handleRefresh = async () => {
        this.setState({ isRefreshing: true })
        try {
            const response = await apiFetch(`${API_URL}/go-heavier/exercises`)
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to load exercises")
            }
            const result = await response.json()

            sessionStorage.setItem('go-heavier-exercises', JSON.stringify(result))

            setTimeout(() => {
                this.setState({
                    exercises: result,
                    configLoaded: true,
                    loadError: null,
                    isRefreshing: false,
                    hasFetchedOnce: true
                })
            }, 300)
        } catch (error) {
            console.error("Error fetching exercises:", error)
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
        // masking the permission problem behind "No exercises found."
        if (!canAccess("GET", "/go-heavier/exercises")) {
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

    toggleFilter = (filterType: 'muscleGroups' | 'specificMuscles' | 'types' | 'equipments', value: string) => {
        const currentValues = this.state.filters[filterType]
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value]
        
        this.setState({
            filters: {
                ...this.state.filters,
                [filterType]: newValues
            }
        })
    }

    getFilteredExercises = () => {
        if (!this.state.exercises) return []

        return this.state.exercises.filter(exercise => {
            // Muscle group filter
            if (this.state.filters.muscleGroups.length > 0) {
                const exerciseGroup = exercise.muscle_group?.toLowerCase()
                const hasMatch = this.state.filters.muscleGroups.some(
                    group => group.toLowerCase() === exerciseGroup
                )
                if (!hasMatch) return false
            }

            // Specific muscle filter
            if (this.state.filters.specificMuscles.length > 0) {
                const exerciseMuscle = exercise.specific_muscle?.toLowerCase()
                const hasMatch = this.state.filters.specificMuscles.some(
                    muscle => muscle.toLowerCase() === exerciseMuscle
                )
                if (!hasMatch) return false
            }

            // Type filter (unilateral/bilateral)
            if (this.state.filters.types.length > 0) {
                const isUnilateral = exercise.bipedal === true
                const hasMatch = this.state.filters.types.some(type => 
                    (type === 'unilateral' && isUnilateral) || (type === 'bilateral' && !isUnilateral)
                )
                if (!hasMatch) return false
            }

            // Equipment filter
            if (this.state.filters.equipments.length > 0) {
                const isFreeWeights = exercise.free_weights === true
                const hasMatch = this.state.filters.equipments.some(equipment => 
                    (equipment === 'free_weights' && isFreeWeights) || (equipment === 'machine' && !isFreeWeights)
                )
                if (!hasMatch) return false
            }

            return true
        })
    }

    getUniqueMuscleGroups = () => {
        if (!this.state.exercises) return []
        const groups = this.state.exercises
            .map(e => e.muscle_group)
            .filter(g => g && g.trim() !== '')
        return Array.from(new Set(groups)).sort()
    }

    getUniqueSpecificMuscles = () => {
        if (!this.state.exercises) return []
        const muscles = this.state.exercises
            .map(e => e.specific_muscle)
            .filter(m => m && m.trim() !== '')
        return Array.from(new Set(muscles)).sort()
    }

    clearFilters = () => {
        this.setState({
            filters: {
                muscleGroups: [],
                specificMuscles: [],
                types: [],
                equipments: []
            }
        })
    }

    render(): React.ReactNode {
        const filteredExercises = this.getFilteredExercises()
        const hasActiveFilters = this.state.filters.muscleGroups.length > 0 || 
                                 this.state.filters.specificMuscles.length > 0 || 
                                 this.state.filters.types.length > 0 || 
                                 this.state.filters.equipments.length > 0

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
                    {this.state.configLoaded === null && (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    )}
                    {this.state.configLoaded === false && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Exercises</h2>
                            <p className="error-message">
                                {this.state.loadError ?? "Failed to load exercises"}
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

                    {this.state.configLoaded && this.state.exercises != null && (
                        <div className="filters-container">
                            <div className="filters-header">
                                <div className="filters-header-left">
                                    <button 
                                        className="toggle-filters-button" 
                                        onClick={() => this.setState({ showFilters: !this.state.showFilters })}
                                    >
                                        <span className="toggle-icon">{this.state.showFilters ? '▼' : '▶'}</span>
                                        <span>🔍 Filter Exercises</span>
                                        {hasActiveFilters && (
                                            <span className="active-filters-badge">{
                                                this.state.filters.muscleGroups.length + 
                                                this.state.filters.specificMuscles.length + 
                                                this.state.filters.types.length + 
                                                this.state.filters.equipments.length
                                            }</span>
                                        )}
                                    </button>
                                </div>
                                {hasActiveFilters && (
                                    <button className="clear-filters-button" onClick={this.clearFilters}>
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                            
                            {this.state.showFilters && (
                                <div className="filters-content">
                                    <div className="filters-sections">
                                        <div className="filter-section">
                                            <h4>💪 Muscle Groups</h4>
                                            <div className="filter-checkboxes">
                                                {this.getUniqueMuscleGroups().map(group => (
                                                    <label key={group} className="filter-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={this.state.filters.muscleGroups.includes(group)}
                                                            onChange={() => this.toggleFilter('muscleGroups', group)}
                                                        />
                                                        <span>{group}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="filter-section">
                                            <h4>🎯 Specific Muscles</h4>
                                            <div className="filter-checkboxes">
                                                {this.getUniqueSpecificMuscles().map(muscle => (
                                                    <label key={muscle} className="filter-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={this.state.filters.specificMuscles.includes(muscle)}
                                                            onChange={() => this.toggleFilter('specificMuscles', muscle)}
                                                        />
                                                        <span>{muscle}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="filter-section">
                                            <h4>⚡ Type</h4>
                                            <div className="filter-checkboxes">
                                                <label className="filter-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={this.state.filters.types.includes('unilateral')}
                                                        onChange={() => this.toggleFilter('types', 'unilateral')}
                                                    />
                                                    <span>Unilateral</span>
                                                </label>
                                                <label className="filter-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={this.state.filters.types.includes('bilateral')}
                                                        onChange={() => this.toggleFilter('types', 'bilateral')}
                                                    />
                                                    <span>Bilateral</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="filter-section">
                                            <h4>🏋️ Equipment</h4>
                                            <div className="filter-checkboxes">
                                                <label className="filter-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={this.state.filters.equipments.includes('free_weights')}
                                                        onChange={() => this.toggleFilter('equipments', 'free_weights')}
                                                    />
                                                    <span>Free Weights</span>
                                                </label>
                                                <label className="filter-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={this.state.filters.equipments.includes('machine')}
                                                        onChange={() => this.toggleFilter('equipments', 'machine')}
                                                    />
                                                    <span>Machine/Bodyweight</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {hasActiveFilters && (
                                <div className="filter-results">
                                    Showing {filteredExercises.length} of {this.state.exercises.length} exercises
                                </div>
                            )}
                        </div>
                    )}

                    {this.state.configLoaded && this.state.exercises != null && filteredExercises.length === 0 && (
                        <div className="header">
                            <p>No exercises found matching the current filters.</p>
                        </div>
                    )}
                    {this.state.configLoaded && filteredExercises.length > 0 && (
                        <div className={`exercises-grid ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            {filteredExercises.map((exercise, index) => (
                                <div key={exercise.id} style={{ animationDelay: `${index * 0.05}s` }}>
                                    <Exercise {...exercise} />
                                </div>
                            ))}
                        </div>
                    )}
                    {this.state.configLoaded && canAccess("POST", "/go-heavier/exercises") && (
                        <button
                            className="add-location-button"
                            onClick={() => {
                                this.setState({ showForm: true })
                            }}
                        >
                            <span className="button-icon">➕</span>
                            Add New Exercise
                        </button>
                    )}
                    {this.state.showForm && (
                        <div>
                            <ExerciseForm
                                onClose={() => {
                                    this.setState({ showForm: false })
                                }}
                                onSuccess={(newExercise) => {
                                    this.state.exercises?.push(newExercise)
                                    sessionStorage.removeItem('go-heavier-exercises')
                                    this.setState({ showForm: false })
                                    this.showToast("Exercise created successfully", 'success')
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
