export function getTimeObject() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 30 * 60000);

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
        fiveMinutesAgo: formatDateTime(fiveMinutesAgo)
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