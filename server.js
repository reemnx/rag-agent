import express from "express";
import dotenv from "dotenv";
import { searchItems } from "./rag/retrieve.js";
import { generatePrompt, getLLMResponse } from "./rag/prompt.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/ask", async (req, res) => {
    try {
        const { query, preferences } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        console.log(`Received query: ${query}`);
        console.log(`Preferences:`, preferences);

        // 1. Retrieve relevant items
        // We can pass preferences as filters if they match our schema
        // For now, we'll just pass the query to retrieval
        // In a real app, we might parse preferences to structured filters
        const filters = {};
        if (preferences) {
            // Example: map 'season' preference to filter
            if (preferences.season) filters.season = preferences.season;
            // Add more mapping as needed
        }

        const searchResults = await searchItems(query, filters);
        console.log(`Found ${searchResults.length} relevant items.`);

        // 2. Generate Prompt
        const prompt = generatePrompt(searchResults, query);

        // 3. Get LLM Response
        const answer = await getLLMResponse(prompt);

        // 4. Return Response
        res.json({
            answer,
            items: searchResults.map(r => r.payload), // Return full item details
        });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
