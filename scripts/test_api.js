import fetch from "node-fetch";

async function test() {
    const url = "http://localhost:3000/ask";
    const body = {
        query: "I need something for a summer rooftop party",
        preferences: {
            season: "summer"
        }
    };

    try {
        console.log("Sending request to:", url);
        console.log("Body:", JSON.stringify(body, null, 2));

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log("\nResponse:");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

test();
