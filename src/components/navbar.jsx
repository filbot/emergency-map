import { useEffect, useState } from "react";
import "./navbar.css";

/**
 * Displays the heading bar with a realtime clock synced to the user's locale.
 * @returns {JSX.Element}
 */
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
            <h1>HERO DASHBOARD</h1>
            <div className="clock">
                {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
            </div>
        </div>
    );
}