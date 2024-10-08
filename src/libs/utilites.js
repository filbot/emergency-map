export function getTimeObject() {
    const THIRTY_MINUTES = 1800000;
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - THIRTY_MINUTES);

    const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    return {
        currentTime: formatDateTime(now),
        thirtyMinutesAgo: formatDateTime(thirtyMinutesAgo)
    };
}

export async function fetchData(endpoint, query, setData) {
    try {
        const response = await fetch(`${endpoint}?${query}`, {
            headers: {
                "X-App-Token": import.meta.env.VITE_APP_TOKEN
            }
        });
        const data = await response.json();
        setData(data);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}