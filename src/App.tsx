import React from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./App.css"

import NavBar from "./components/NavBar"
import Home from "./pages/Home"
import About from "./pages/About"
import NotFound from "./pages/NotFound"
import Privacy from "./pages/Privacy"

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
import Import from "./pages/go_heavier/Import"
import Admin from "./pages/Admin"
import ProvisionUser from "./pages/admin/ProvisionUser"
import SquashRequests from "./pages/admin/SquashRequests"
import Users from "./pages/admin/Users"
import Finance from "./pages/Finance"
import Transactions from "./pages/finance/Transactions"
import TransactionDetail from "./pages/finance/TransactionDetail"
import Insights from "./pages/finance/Insights"
import Budgets from "./pages/finance/Budgets"
import Manage from "./pages/finance/Manage"
import Squash from "./pages/Squash"
import MatchDetail from "./pages/squash/MatchDetail"
import GameDetail from "./pages/squash/GameDetail"
import SquashGames from "./pages/squash/Games"
import SquashHome from "./pages/squash/Home"
import SquashHowItWorks from "./pages/squash/HowItWorks"
import SquashPlayers from "./pages/squash/Players"
import PlayerDetail from "./pages/squash/PlayerDetail"
import SquashStats from "./pages/squash/Stats"
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
                        <Route path="/go-heavier/import" element={<Import />} />
                        <Route path="/finance" element={<Finance />} />
                        <Route path="/finance/transactions" element={<Transactions />} />
                        <Route path="/finance/transactions/:id" element={<TransactionDetail />} />
                        <Route path="/finance/insights" element={<Insights />} />
                        <Route path="/finance/budgets" element={<Budgets />} />
                        <Route path="/finance/manage" element={<Manage />} />
                        <Route path="/squash" element={<SquashHome />} />
                        <Route path="/squash/matches" element={<Squash />} />
                        <Route path="/squash/games" element={<SquashGames />} />
                        <Route path="/squash/how" element={<SquashHowItWorks />} />
                        <Route path="/squash/matches/:id" element={<MatchDetail />} />
                        <Route path="/squash/matches/:id/games/:number" element={<GameDetail />} />
                        <Route path="/squash/players" element={<SquashPlayers />} />
                        <Route path="/squash/players/:id" element={<PlayerDetail />} />
                        <Route path="/squash/stats" element={<SquashStats />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/provision" element={<ProvisionUser />} />
                        <Route path="/admin/users" element={<Users />} />
                        <Route path="/admin/squash-requests" element={<SquashRequests />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </div>
            <div>
            </div>
        </GoogleOAuthProvider>
    )
}

export default App
