import "./popup.css";

export default function Popup({ data }) {
    return (
        <div className="popup-container">
            <p>Incident Type: {data.type}</p>
            <p>Incident Time: {data.datetime}</p>
            <p>Incident Address: {data.address}</p>
        </div>
    );
}