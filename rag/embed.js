import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

const embedder = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small", // Cost-effective and high performance
});

export function productToText(item) {
    return `
Title: ${item.title}
Category: ${item.category}
Color: ${item.color}
Fit: ${item.fit}
Season: ${item.season.join(", ")}
Occasion: ${item.occasion.join(", ")}
Fabric: ${item.fabric}
Description: ${item.description}
Tags: ${item.tags.join(", ")}
  `.trim();
}

export async function getEmbeddings(text) {
    try {
        return await embedder.embedQuery(text);
    } catch (error) {
        console.error("Error generating embeddings:", error);
        throw error;
    }
}
