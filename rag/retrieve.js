import qdrant, { COLLECTION_NAME } from "../vector/qdrant.js";
import { getEmbeddings } from "./embed.js";

export async function searchItems(userQuery, filters = {}) {
    try {
        const queryEmbedding = await getEmbeddings(userQuery);

        const searchParams = {
            vector: queryEmbedding,
            limit: 5,
            with_payload: true,
        };

        // Construct Qdrant filter if filters are provided
        if (Object.keys(filters).length > 0) {
            const must = [];
            for (const [key, value] of Object.entries(filters)) {
                if (value) {
                    // Simple match filter. 
                    // Note: In a real app, you might need more complex filtering logic (e.g. "one of", ranges, etc.)
                    // For this demo, we assume simple key-value match.
                    must.push({ key: key, match: { value: value } });
                }
            }
            if (must.length > 0) {
                searchParams.filter = { must };
            }
        }

        const results = await qdrant.search(COLLECTION_NAME, searchParams);
        return results;
    } catch (error) {
        console.error("Error searching items:", error);
        throw error;
    }
}
