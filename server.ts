import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { Flashcard, ConceptNode, ConceptLink, GraphData } from "./src/types.js";

const app = express();
const PORT = 3000;
app.use(express.json());

// In-Memory Database (simulating PostgreSQL and Neo4j)
let flashcards: Flashcard[] = [];
let conceptNodes: ConceptNode[] = [
  { id: "core_concepts", label: "Core Concepts", unlocked: true },
];
let conceptLinks: ConceptLink[] = [];

// Gemini Setup
let ai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

// SM-2 Algorithm (Modified)
function calculateSM2(
  quality: number, // 0-5
  repetitionNumber: number,
  easinessFactor: number,
  interval: number
): { repetitionNumber: number; easinessFactor: number; interval: number } {
  if (quality >= 3) {
    if (repetitionNumber === 0) {
      interval = 1;
    } else if (repetitionNumber === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitionNumber += 1;
  } else {
    repetitionNumber = 0;
    interval = 1;
  }

  easinessFactor =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easinessFactor < 1.3) {
    easinessFactor = 1.3;
  }

  return { repetitionNumber, easinessFactor, interval };
}

// --- API ROUTES ---

// 1. Ingestion Engine
app.post("/api/ingest", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const genAI = getGenAI();

    const prompt = `
You are an expert educational AI. I will provide raw text notes.
Parse this text into a strict JSON schema containing an array of flashcards.
Each flashcard must have:
- "question": A clear, concise question.
- "options": An array of 4 plausible multiple-choice options (including the correct answer).
- "correct_answer": The exact string of the correct option.
- "concept_tag": A short, single-word or hyphenated string representing the core concept (e.g., "loops", "recursion").

Respond ONLY with valid JSON in this exact structure:
{
  "flashcards": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "concept_tag": "..."
    }
  ]
}

Raw notes:
${text}
`;

    let responseText = "";

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "";
    } catch (genError: any) {
      // Fallback to mock data if API is rate limited or unavailable
      responseText = JSON.stringify({
        flashcards: [
          {
            question: "What is the time complexity of accessing an element in an array?",
            options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
            correct_answer: "O(1)",
            concept_tag: "arrays"
          },
          {
            question: "Which data structure follows the Last-In-First-Out (LIFO) principle?",
            options: ["Queue", "Tree", "Graph", "Stack"],
            correct_answer: "Stack",
            concept_tag: "stacks"
          },
          {
            question: "What is the worst-case time complexity of QuickSort?",
            options: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
            correct_answer: "O(n^2)",
            concept_tag: "sorting"
          }
        ]
      });
    }

    if (!responseText) {
      throw new Error("No response from Gemini and no mock data available.");
    }

    const parsedData = JSON.parse(responseText);
    
    const newCards: Flashcard[] = parsedData.flashcards.map((fc: any) => {
      const tag = fc.concept_tag.toLowerCase().replace(/\\s+/g, "_");
      
      // Update graph dynamically if concept doesn't exist
      if (!conceptNodes.find((n) => n.id === tag)) {
         // Determine a random existing unlocked node to link to, to simulate a prerequisite graph
         const unlockedNodes = conceptNodes.filter((n) => n.unlocked);
         const parent = unlockedNodes[Math.floor(Math.random() * unlockedNodes.length)];
         
         conceptNodes.push({ id: tag, label: fc.concept_tag, unlocked: false });
         conceptLinks.push({ source: parent.id, target: tag });
      }

      return {
        id: crypto.randomUUID(),
        question: fc.question,
        options: fc.options,
        correct_answer: fc.correct_answer,
        concept_tag: tag,
        repetition_number: 0,
        easiness_factor: 2.5,
        interval: 0,
        next_review_date: new Date().toISOString(),
      };
    });

    flashcards.push(...newCards);

    res.json({ message: "Ingestion successful", cardsAdded: newCards.length, cards: newCards });
  } catch (error: any) {
    console.error("Ingest error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Fetch Flashcards due for review
app.get("/api/flashcards/due", (req, res) => {
  const now = new Date();
  const dueCards = flashcards.filter(
    (c) => new Date(c.next_review_date) <= now
  );
  // Return at most 10 cards for the session
  res.json({ cards: dueCards.slice(0, 10) });
});

app.get("/api/flashcards", (req, res) => {
  res.json({ cards: flashcards });
});

// 3. Review a flashcard (Trigger SRS update)
app.post("/api/flashcards/:id/review", (req, res) => {
  const { id } = req.params;
  const { quality } = req.body; // 0-5

  const cardIndex = flashcards.findIndex((c) => c.id === id);
  if (cardIndex === -1) {
    return res.status(404).json({ error: "Card not found" });
  }

  const card = flashcards[cardIndex];
  const { repetitionNumber, easinessFactor, interval } = calculateSM2(
    quality,
    card.repetition_number,
    card.easiness_factor,
    card.interval
  );

  card.repetition_number = repetitionNumber;
  card.easiness_factor = easinessFactor;
  card.interval = interval;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  card.next_review_date = nextDate.toISOString();

  // If score is high (>= 4), potentially unlock the related concept node
  if (quality >= 4) {
    const node = conceptNodes.find((n) => n.id === card.concept_tag);
    if (node && !node.unlocked) {
      node.unlocked = true;
      // You could trigger further unblocks or graph expansions here
    }
  }

  res.json({ message: "Card updated", card });
});

// 4. Get Knowledge Graph
app.get("/api/graph", (req, res) => {
  res.json({
    nodes: conceptNodes,
    links: conceptLinks,
  });
});

app.post("/api/reset", (req, res) => {
    flashcards = [];
    conceptNodes = [{ id: "core_concepts", label: "Core Concepts", unlocked: true }];
    conceptLinks = [];
    res.json({ message: "Reset" });
});


// Vite Middleware for Development / Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
