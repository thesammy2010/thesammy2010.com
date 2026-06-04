import React from "react"
import "./Exercise.css"
import "./ExerciseForm.css"
import { useNavigate } from "react-router-dom"

interface Props {
    id: string
    name: string
    description: string
    muscle_group: string
    specific_muscle: string
    bipedal: boolean
    free_weights: boolean
    image_url: string
    created_at: string
    updated_at: string
    navigate: any
}

interface State {
    loaded: boolean
    deleted: boolean
}

export class Exercise extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            loaded: true,
            deleted: false
        }
    }

    handleCardClick = () => {
        this.props.navigate(`/go-heavier/exercises/${this.props.id}`)
    }

    render(): React.ReactNode {
        if (this.state.deleted) {
            return null
        }

        return (
            <div className="exercise-container" onClick={this.handleCardClick}>
                {this.props.image_url && (
                    <div className="exercise-image">
                        <img src={this.props.image_url} alt={this.props.name} />
                    </div>
                )}
                <div className="exercise-main-content">
                    <h2 className="exercise-title">{this.props.name}</h2>
                    {this.props.description && (
                        <p className="exercise-description">{this.props.description}</p>
                    )}
                </div>
                <div className="exercise-details">
                    <div className="exercise-tags">
                        {this.props.muscle_group && (
                            <span className="tag tag-muscle">💪 {this.props.muscle_group}</span>
                        )}
                        {this.props.specific_muscle && (
                            <span className="tag tag-specific">🎯 {this.props.specific_muscle}</span>
                        )}
                        {this.props.bipedal && (
                            <span className="tag tag-bipedal">🦵 Unilateral</span>
                        )}
                        {this.props.free_weights && (
                            <span className="tag tag-free">🏋️ Free Weights</span>
                        )}
                    </div>
                </div>
            </div>
        )
    }
}

// Wrapper component to use React Router hooks
function ExerciseWrapper(props: Omit<Props, 'navigate'>) {
    const navigate = useNavigate()
    return <Exercise {...props} navigate={navigate} />
}

export default ExerciseWrapper
