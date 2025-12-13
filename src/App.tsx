import React from "react"
import "./App.css"

import Footer from "./components/Footer"
import Home from "./pages/Home"
import About from "./pages/About"
import NotFound from "./pages/NotFound"

import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import GoHeavier from "./pages/GoHeavier"

const NavBar: React.FC = () => (
    <nav className="navbar">
        <Link to="/">Home</Link>
        {" | "}
        <Link to="/go-heavier">Go Heavier</Link> | <Link to="/about">About</Link>
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
