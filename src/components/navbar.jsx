import React, { useState, useEffect } from "react";
import "./navbar.css";

export default function Navbar() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="heading">
            <h1>Hero Dashboard</h1>
            <div className="clock">
                {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
            </div>
        </div>
    );
}