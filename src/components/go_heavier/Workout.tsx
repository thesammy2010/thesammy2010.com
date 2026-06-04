import React from "react"
import { useNavigate } from "react-router-dom"
import "./Workout.css"

interface WorkoutProps {
    id: string
    location_id: string
    location_name?: string
    exercise_id: string
    exercise_name?: string
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

class WorkoutClass extends React.Component<WorkoutProps & { navigate: any }> {
    handleClick = () => {
        this.props.navigate(`/go-heavier/workouts/${this.props.id}`)
    }

    formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    render(): React.ReactNode {
        const totalWeight = this.props.weight_kg + 
                          (this.props.bar_weight_kg || 0) + 
                          (this.props.supplementary_weight_kg || 0)

        return (
            <div className="workout-container" onClick={this.handleClick}>
                <div className="workout-header">
                    <div className="workout-time">
                        📅 {this.formatDate(this.props.workout_time)}
                    </div>
                    <div className="workout-index-badge">Set #{this.props.index}</div>
                </div>

                <div className="workout-main">
                    <h3 className="workout-exercise">
                        🏋️ {this.props.exercise_name || `Exercise ${this.props.exercise_id.substring(0, 8)}`}
                    </h3>
                    <p className="workout-location">
                        📍 {this.props.location_name || `Location ${this.props.location_id.substring(0, 8)}`}
                    </p>
                </div>

                <div className="workout-stats">
                    <div className="workout-stat">
                        <span className="stat-label">Reps</span>
                        <span className="stat-value">{this.props.repetitions}</span>
                    </div>
                    <div className="workout-stat-divider"></div>
                    <div className="workout-stat">
                        <span className="stat-label">Weight</span>
                        <span className="stat-value">{totalWeight.toFixed(1)} kg</span>
                    </div>
                </div>

                {this.props.notes && (
                    <div className="workout-notes">
                        💬 {this.props.notes}
                    </div>
                )}
            </div>
        )
    }
}

export default function Workout(props: WorkoutProps) {
    const navigate = useNavigate()
    return <WorkoutClass {...props} navigate={navigate} />
}
