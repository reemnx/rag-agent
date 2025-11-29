import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

const llm = new ChatOpenAI({
    modelName: "gpt-4o", // Or gpt-3.5-turbo
    temperature: 0.7,
    apiKey: process.env.OPENAI_API_KEY
});

export function generatePrompt(items, userQuery) {
    const context = items
        .map((item, index) => {
            const p = item.payload;
            return `
Item ${index + 1}:
Title: ${p.title}
Category: ${p.category}
Color: ${p.color}
Fit: ${p.fit}
Season: ${p.season ? p.season.join(", ") : ""}
Occasion: ${p.occasion ? p.occasion.join(", ") : ""}
Fabric: ${p.fabric}
Description: ${p.description}
Price: $${p.price}
      `.trim();
        })
        .join("\n---\n");

    return `
You are a fashion shopping assistant.
Use ONLY the provided context to make clothing recommendations.

Consider:
- User's event
- Season
- Colors
- Fit preferences
- Style preferences

Return at least recommended items.
else if the user note a different number.

<context>
${context}
</context>

User Query:
${userQuery}

Answer:
  `.trim();
}

export async function getLLMResponse(prompt) {
    try {
        const response = await llm.invoke(prompt);
        return response.content;
    } catch (error) {
        console.error("Error calling LLM:", error);
        throw error;
    }
}
