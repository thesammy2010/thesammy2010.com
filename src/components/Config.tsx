import React from "react"

import "./Config.css"

export interface ConfigModel {
    default: {
        IsoCountryCode: string[]
    }
    "go-heavier": {
        MuscleGroup: string[]
        SpecificMuscle: string[]
    }
}

interface Props {
    config: string
}

export default class Config extends React.Component<Props, {}> {
    render(): React.ReactNode {
        const cfg = JSON.parse(this.props.config) as ConfigModel
        return (
            <div className="center-container-grid">
                <div className="header">
                    <h3>Config</h3>
                    <p>This component holds configuration data.</p>
                </div>
                <br />
                <h4 className="header">Default</h4>
                <div className="dropdowns">
                    <label htmlFor="countries">Countries: </label>
                    <select id="countries" name="countries">
                        {cfg.default.IsoCountryCode.map((country, index) => (
                            <option key={index} value={country}>
                                {country}
                            </option>
                        ))}
                    </select>
                </div>
                <br />
                <h4 className="header">Go Heavier</h4>
                <div className="dropdowns">
                    <label htmlFor="muscleGroup">Muscle Groups: </label>
                    <select id="muscleGroup" name="muscleGroup">
                        {cfg["go-heavier"].MuscleGroup.map((muscleGroup, index) => (
                            <option key={index} value={muscleGroup}>
                                {muscleGroup}
                            </option>
                        ))}
                    </select>
                    <label htmlFor="specificMuscle"> Muscle Groups: </label>
                    <select id="specificMuscle" name="specificMuscle">
                        {cfg["go-heavier"].SpecificMuscle.map((specificMuscle, index) => (
                            <option key={index} value={specificMuscle}>
                                {specificMuscle}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        )
    }
}
