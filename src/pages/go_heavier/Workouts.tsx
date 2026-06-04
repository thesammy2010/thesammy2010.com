import React from "react"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import "./Workouts.css"

export default class Workouts extends React.Component {
    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    <br />
                    <div className="header">
                        <h2>Workouts Page</h2>
                        <p>This is the Workouts page.</p>
                    </div>
                </div>
            </div>
        )
    }
}
