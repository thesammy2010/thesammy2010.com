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
                        to="/go-heavier" 
                        className={location.pathname === "/go-heavier" ? "active" : ""}
                    >
                        🏠 Dashboard
                    </Link>
                    <Link 
                        to="/go-heavier/locations" 
                        className={location.pathname === "/go-heavier/locations" || location.pathname.startsWith("/go-heavier/locations/") ? "active" : ""}
                    >
                        📍 Locations
                    </Link>
                    <Link 
                        to="/go-heavier/exercises" 
                        className={location.pathname === "/go-heavier/exercises" || location.pathname.startsWith("/go-heavier/exercises/") ? "active" : ""}
                    >
                        🏋️ Exercises
                    </Link>
                    <Link 
                        to="/go-heavier/sessions" 
                        className={location.pathname === "/go-heavier/sessions" || location.pathname.startsWith("/go-heavier/sessions/") ? "active" : ""}
                    >
                        🗓️ Sessions
                    </Link>
                    <Link 
                        to="/go-heavier/stats" 
                        className={location.pathname === "/go-heavier/stats" ? "active" : ""}
                    >
                        📈 Stats
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
