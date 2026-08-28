import React from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./App.css"

import Footer from "./components/Footer"
import NavBar from "./components/NavBar"
import Home from "./pages/Home"
import About from "./pages/About"
import NotFound from "./pages/NotFound"

import { BrowserRouter, Routes, Route } from "react-router-dom"
import GoHeavier from "./pages/GoHeavier"
import Locations from "./pages/go_heavier/Locations"
import LocationDetail from "./pages/go_heavier/LocationDetail"
import Exercises from "./pages/go_heavier/Exercises"
import ExerciseDetail from "./pages/go_heavier/ExerciseDetail"
import Sessions from "./pages/go_heavier/Sessions"
import Stats from "./pages/go_heavier/Stats"
import SessionDetail from "./pages/go_heavier/SessionDetail"
import Workouts from "./pages/go_heavier/Workouts"
import Admin from "./pages/Admin"
import ProvisionUser from "./pages/admin/ProvisionUser"
import Users from "./pages/admin/Users"
import { GOOGLE_CLIENT_ID } from "./configs"

const App: React.FC = () => {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div>
                <BrowserRouter>
                    <NavBar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/go-heavier" element={<GoHeavier />} />
                        <Route path="/go-heavier/locations" element={<Locations />} />
                        <Route path="/go-heavier/locations/:id" element={<LocationDetail />} />
                        <Route path="/go-heavier/exercises" element={<Exercises />} />
                        <Route path="/go-heavier/exercises/:id" element={<ExerciseDetail />} />
                        <Route path="/go-heavier/sessions" element={<Sessions />} />
                        <Route path="/go-heavier/stats" element={<Stats />} />
                        <Route path="/go-heavier/sessions/:id" element={<SessionDetail />} />
                        <Route path="/go-heavier/workouts" element={<Workouts />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/provision" element={<ProvisionUser />} />
                        <Route path="/admin/users" element={<Users />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </div>
            <div>
                <Footer />
            </div>
        </GoogleOAuthProvider>
    )
}

export default App
