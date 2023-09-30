import React from "react"
import "./App.css"

import { Routes, Route } from "react-router-dom"

import Footer from "./components/Footer"
import HomePage from "./pages/Home"
import NotFound from "./pages/NotFound"

export default function App() {
    return (
        <div id="page-container">
            <div id="router">
                <Routes>
                    <Route path="/">
                        <Route index element={<HomePage />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </div>
            <Footer />
        </div>
    )
}
