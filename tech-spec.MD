# **RAG Fashion Assistant — Technical Specification**

This document defines the complete requirements, architecture, and data structures for building a **pure Retrieval-Augmented Generation (RAG)** system for a fashion/clothing recommendation agent. The implementation should be done using **Node.js + Express**, with **LangChain for chunking and embeddings**, and a recommended **vector database**.

---

# ## 1. System Overview

The goal is to build a **Fashion Assistant AI Agent** capable of:

* Understanding customer questions (e.g., *"What should I wear to a summer rooftop party?"*)
* Considering customer preferences (color, fit, style, budget)
* Retrieving the most relevant clothing items from a product catalogue
* Producing a natural-language recommendation using retrieved items

**Key requirement:** *The LLM should NOT receive the entire catalogue.* Only relevant chunks are passed via RAG.

---

# ## 2. Architecture

```
User → Express API → RAG Pipeline → Vector Store Retrieval → LLM Response
```

### Components:

1. **Express Server**
2. **RAG Pipeline**

   * Query embedding
   * Vector similarity search
   * Retrieval of top K product chunks
3. **Chunking Engine** (LangChain RecursiveCharacterTextSplitter)
4. **Embeddings Engine** (OpenAI or compatible model via LangChain)
5. **Vector Database** (recommended: **Qdrant** or **Pinecone**)
6. **LLM Model Call** (OpenAI, Claude, Groq Llama, etc.)

---

# ## 3. Recommended Vector Database

## **Primary Recommendation: Qdrant**

### Why Qdrant?

* Fast similarity search
* Strong Node.js client
* Metadata filtering
* Open source + cloud option

### Qdrant Setup Instructions

1. Create Qdrant cloud instance or run Docker version:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

2. Create collection:

```js
await qdrant.createCollection("fashion_items", {
  vectors: { size: 1536, distance: "Cosine" },
});
```

3. Upsert embedded item vectors.

---

# ## 4. Data Structure & Catalog Format

Each clothing item should be stored as **one rich chunk**, NOT multiple.

### Product Schema

```json
{
  "id": "SKU-12345",
  "title": "Slim-Fit Beige Linen Shirt",
  "category": "Men/Shirts",
  "color": "Beige",
  "fit": "Slim",
  "season": ["summer", "spring"],
  "occasion": ["beach wedding", "smart casual", "summer events"],
  "fabric": "100% linen",
  "price": 79,
  "description": "Lightweight breathable linen shirt ideal for warm weather and outdoor events.",
  "tags": ["breathable", "neutral", "lightweight", "summer"]
}
```

---

# ## 5. Sample Dataset (for initial embedding)

### **fashion_items.json**

```json
[
  {
    "id": "ITEM-001",
    "title": "Slim-Fit Beige Linen Shirt",
    "category": "Men/Shirts",
    "color": "Beige",
    "fit": "Slim",
    "season": ["summer", "spring"],
    "occasion": ["summer party", "beach wedding", "smart casual"],
    "fabric": "100% linen",
    "price": 79,
    "description": "Lightweight breathable linen shirt ideal for warm-weather outdoor events.",
    "tags": ["breathable", "neutral", "lightweight"]
  },
  {
    "id": "ITEM-002",
    "title": "Oversized Black Streetwear Jacket",
    "category": "Men/Jackets",
    "color": "Black",
    "fit": "Oversized",
    "season": ["fall", "winter"],
    "occasion": ["night out", "urban", "streetwear"],
    "fabric": "Poly-cotton blend",
    "price": 129,
    "description": "Bold oversized jacket with a clean streetwear silhouette and modern minimalist look.",
    "tags": ["street", "urban", "oversized", "black"]
  },
  {
    "id": "ITEM-003",
    "title": "Casual Blue Denim Jeans",
    "category": "Men/Pants",
    "color": "Blue",
    "fit": "Regular",
    "season": ["all-season"],
    "occasion": ["daily wear", "casual"],
    "fabric": "Denim",
    "price": 59,
    "description": "Classic blue denim jeans with a comfortable fit suitable for everyday wear.",
    "tags": ["denim", "casual", "everyday"]
  }
]
```

---

# ## 6. Chunking Strategy (LangChain)

The system uses **one chunk per product**, but uses LangChain to ensure consistent formatting.

### Chunking Code Example

```js
import { RecursiveCharacterTextSplitter } from "@langchain/core/text_splitter";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400,
  chunkOverlap: 50
});

const chunks = await splitter.splitText(JSON.stringify(product));
```

**Note:** For product-level documents, chunking usually returns **one chunk per item**, which is ideal.

---

# ## 7. Embedding Pipeline

### Step 1 — Combine item data into a single descriptive string

```js
function productToText(item) {
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
  `;
}
```

### Step 2 — Embed using LangChain

```js
import { OpenAIEmbeddings } from "@langchain/openai";

const embedder = new OpenAIEmbeddings();
const vector = await embedder.embedQuery(productText);
```

### Step 3 — Insert into Qdrant

```js
await qdrant.upsert("fashion_items", {
  points: [
    {
      id: item.id,
      vector,
      payload: item
    }
  ]
});
```

---

# ## 8. Retrieval Pipeline

### Step 1 — Embed user query

```js
const queryEmbedding = await embedder.embedQuery(userText);
```

### Step 2 — Vector search with metadata filter

```js
const results = await qdrant.search("fashion_items", {
  vector: queryEmbedding,
  limit: 5,
  filter: {
    must: [
      { key: "season", match: { value: "summer" } }
    ]
  }
});
```

### Step 3 — Construct LLM prompt

```
<context>
Item 1:
Title: Slim-Fit Beige Linen Shirt
Description: ...
---
Item 2:
...
</context>

User: "Looking for something stylish for a summer rooftop party. Neutral colors."

Assistant: Suggest the best options.
```

---

# ## 9. LLM Recommendation Prompt Template

```
You are a fashion shopping assistant.
Use ONLY the provided context to make clothing recommendations.

Consider:
- User's event
- Season
- Colors
- Fit preferences
- Style preferences

Return 3–5 recommended items.

<context>
{{retrieved_items}}
</context>

User Query:
{{query}}

Answer:
```

---

# ## 10. Express API Structure

## **POST /ask**

Receives a user query + optional preferences.

### Input:

```json
{
  "query": "I need something for a summer rooftop party",
  "preferences": {
    "color": "neutral",
    "fit": "slim"
  }
}
```

### Output:

```json
{
  "answer": "For a summer rooftop party, here are some great options...",
  "items": [ ...retrieved chunks... ]
}
```

---

# ## 11. Project File Structure

```
ragsystem/
  server.js
  rag/
    chunk.js
    embed.js
    retrieve.js
    prompt.js
  data/
    fashion_items.json
  vector/
    qdrant.js
```

---

# ## 12. Future Expansion

* Add multi-language support
* Add filtering by size + inventory
* Integrate images
* Support vector reranking (ColBERT / BGE Reranker)
* Add caching layer

---

# ## 13. Summary

This specification outlines:

* A pure RAG implementation
* LangChain for chunking & embeddings
* Qdrant as the vector DB
* A clean data structure for fashion items
* Complete retrieval, embedding, and prompting flow
* Example dataset
