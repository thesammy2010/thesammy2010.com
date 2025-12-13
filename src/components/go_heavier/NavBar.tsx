import { Link } from "react-router-dom"

export default function GoHeavierNavBar() {
    return (
        <div className="header">
            <h2>Go Heavier</h2>
            <nav>
                <Link to="/go-heavier/locations">Locations</Link> | <Link to="/go-heavier/exercises">Exercises</Link> |{" "}
                <Link to="/go-heavier/workouts">Workouts</Link>
            </nav>
        </div>
    )
}
