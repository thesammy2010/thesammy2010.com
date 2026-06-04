import { Link, useLocation } from "react-router-dom"
import "./NavBar.css"

export default function GoHeavierNavBar() {
    const location = useLocation()

    return (
        <div className="go-heavier-navbar">
            <div className="navbar-content">
                <h1 className="navbar-brand">💪 Go Heavier</h1>
                <nav className="navbar-links">
                    <Link 
                        to="/go-heavier/locations" 
                        className={location.pathname === "/go-heavier/locations" ? "active" : ""}
                    >
                        📍 Locations
                    </Link>
                    <Link 
                        to="/go-heavier/exercises" 
                        className={location.pathname === "/go-heavier/exercises" ? "active" : ""}
                    >
                        🏋️ Exercises
                    </Link>
                    <Link 
                        to="/go-heavier/workouts" 
                        className={location.pathname === "/go-heavier/workouts" ? "active" : ""}
                    >
                        📋 Workouts
                    </Link>
                </nav>
            </div>
        </div>
    )
}
