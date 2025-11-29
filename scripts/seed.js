import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import qdrant, { initCollection, COLLECTION_NAME } from "../vector/qdrant.js";
import { productToText, getEmbeddings } from "../rag/embed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
    try {
        console.log("Starting seeding process...");

        // Initialize collection
        await initCollection();

        // Read data
        const dataPath = path.join(__dirname, "../data/fashion_items.json");
        const data = JSON.parse(await fs.readFile(dataPath, "utf-8"));
        console.log(`Loaded ${data.length} items from ${dataPath}`);

        const points = [];

        for (const item of data) {
            console.log(`Processing item: ${item.title}`);
            const text = productToText(item);
            const vector = await getEmbeddings(text);

            points.push({
                id: item.id, // Ensure IDs are unique strings or UUIDs. Qdrant supports string UUIDs or integers.
                // If these are arbitrary strings, we might need to hash them to UUIDs or use integer IDs.
                // For simplicity, let's assume Qdrant handles these string IDs if we use UUID format or just let Qdrant generate if needed.
                // Wait, Qdrant IDs must be unsigned integers or UUIDs. 
                // "ITEM-001" is not a valid UUID. 
                // I will generate a UUID for each item or use a hash. 
                // Let's use a simple uuid generator for now or just use the index as integer ID if persistent ID isn't strictly required to match external DB for this demo.
                // Better: Use a UUID generator based on the ID string to be deterministic.
                // For this demo, I'll just use a random UUID and store the original ID in payload.
                id: crypto.randomUUID(),
                vector: vector,
                payload: item,
            });
        }

        // Upsert to Qdrant
        console.log(`Upserting ${points.length} points to Qdrant...`);
        await qdrant.upsert(COLLECTION_NAME, {
            wait: true,
            points: points,
        });

        console.log("Seeding completed successfully!");
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
