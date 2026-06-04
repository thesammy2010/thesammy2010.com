import React from "react"
import "./App.css"

import Footer from "./components/Footer"
import Home from "./pages/Home"
import About from "./pages/About"
import NotFound from "./pages/NotFound"

import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import GoHeavier from "./pages/GoHeavier"
import Locations from "./pages/go_heavier/Locations"
import LocationDetail from "./pages/go_heavier/LocationDetail"
import Exercises from "./pages/go_heavier/Exercises"
import ExerciseDetail from "./pages/go_heavier/ExerciseDetail"
import Workouts from "./pages/go_heavier/Workouts"

const NavBar: React.FC = () => (
    <nav className="navbar">
        <div>
            <Link to="/">
                <img
                    src={process.env.PUBLIC_URL + "/icons/logo.svg"}
                    // className="wrapper-logo"
                    alt="TheSammy2010 Logo"
                ></img>
            </Link>{" "}
        </div>
        | <Link to="/go-heavier">Go Heavier</Link> | <Link to="/about">About</Link>
    </nav>
)

const App: React.FC = () => {
    return (
        <div>
            <div>
                <BrowserRouter>
                    <NavBar />
                    <hr />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/go-heavier" element={<GoHeavier />} />
                        <Route path="/go-heavier/locations" element={<Locations />} />
                        <Route path="/go-heavier/locations/:id" element={<LocationDetail />} />
                        <Route path="/go-heavier/exercises" element={<Exercises />} />
                        <Route path="/go-heavier/exercises/:id" element={<ExerciseDetail />} />
                        <Route path="/go-heavier/workouts" element={<Workouts />} />
                        {/* <Route path="/go-heavier/exercises/:locationId" element={<Exercises />} /> */}
                        <Route path="/about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </div>
            <div>
                <Footer />
            </div>
        </div>
    )
}

export default App
