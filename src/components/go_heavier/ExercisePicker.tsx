import React from "react"

import { filterExercises } from "./logWorkout"
import "./ExercisePicker.css"

export interface PickableExercise {
    id: string
    name: string
    muscle_group?: string
}

interface Props {
    exercises: PickableExercise[]
    value: string
    onChange: (exerciseId: string) => void
    label?: string
}

let nextListId = 0

interface State {
    query: string
    open: boolean
    highlighted: number
}

export default class ExercisePicker extends React.Component<Props, State> {
    private containerRef = React.createRef<HTMLDivElement>()
    private listId = `exercise-picker-list-${(nextListId += 1)}`

    constructor(props: Props) {
        super(props)
        this.state = {
            query: "",
            open: false,
            highlighted: 0
        }
    }

    componentDidMount() {
        document.addEventListener("mousedown", this.handleOutsideClick)
    }

    componentWillUnmount() {
        document.removeEventListener("mousedown", this.handleOutsideClick)
    }

    handleOutsideClick = (event: MouseEvent) => {
        if (this.state.open && !this.containerRef.current?.contains(event.target as Node)) {
            this.close()
        }
    }

    selectedName = (): string => {
        const selected = this.props.exercises.find(exercise => exercise.id === this.props.value)
        return selected ? selected.name : ""
    }

    matches = (): PickableExercise[] => filterExercises(this.props.exercises, this.state.query)

    open = () => {
        this.setState({ open: true, query: "", highlighted: 0 })
    }

    close = () => {
        this.setState({ open: false, query: "" })
    }

    choose = (exercise: PickableExercise) => {
        this.props.onChange(exercise.id)
        this.close()
    }

    handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const matches = this.matches()

        if (event.key === "ArrowDown") {
            event.preventDefault()
            this.setState({ open: true, highlighted: Math.min(this.state.highlighted + 1, matches.length - 1) })
            return
        }

        if (event.key === "ArrowUp") {
            event.preventDefault()
            this.setState({ highlighted: Math.max(this.state.highlighted - 1, 0) })
            return
        }

        if (event.key === "Enter") {
            const choice = matches[this.state.highlighted]
            if (this.state.open && choice) {
                event.preventDefault()
                this.choose(choice)
            }
            return
        }

        if (event.key === "Escape" && this.state.open) {
            event.preventDefault()
            this.close()
        }
    }

    render(): React.ReactNode {
        const matches = this.matches()
        const selectedName = this.selectedName()

        return (
            <div className="exercise-picker" ref={this.containerRef}>
                <input
                    type="text"
                    className="exercise-picker-input"
                    role="combobox"
                    aria-expanded={this.state.open}
                    aria-controls={this.listId}
                    aria-label={this.props.label ?? "Exercise"}
                    placeholder={selectedName || "Search exercises..."}
                    value={this.state.open ? this.state.query : selectedName}
                    onFocus={this.open}
                    onChange={(e) => this.setState({ open: true, query: e.target.value, highlighted: 0 })}
                    onKeyDown={this.handleKeyDown}
                />

                {this.state.open && (
                    <ul id={this.listId} className="exercise-picker-list" role="listbox">
                        {matches.length === 0 && (
                            <li className="exercise-picker-empty">No exercises match</li>
                        )}
                        {matches.map((exercise, index) => (
                            <li key={exercise.id}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={exercise.id === this.props.value}
                                    className={
                                        index === this.state.highlighted
                                            ? "exercise-picker-option highlighted"
                                            : "exercise-picker-option"
                                    }
                                    onMouseEnter={() => this.setState({ highlighted: index })}
                                    onClick={() => this.choose(exercise)}
                                >
                                    <span className="exercise-picker-name">{exercise.name}</span>
                                    {exercise.muscle_group && (
                                        <span className="exercise-picker-muscle">{exercise.muscle_group}</span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }
}
