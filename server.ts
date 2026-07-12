import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { SearchQueryConfig, SearchStep, WikipediaResult, ArxivResult, GroundingSource, SearchResponse } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper function to clean search terms (remove punctuation and excessive whitespace)
function cleanQuery(query: string): string {
  return query.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

// Helper: Fetch Wikipedia articles
async function searchWikipedia(query: string): Promise<{ results: WikipediaResult[]; step: SearchStep }> {
  const startTime = Date.now();
  const cleaned = cleanQuery(query);
  if (!cleaned) {
    return {
      results: [],
      step: {
        id: "wikipedia",
        title: "Wikipedia Knowledge Source",
        status: "success",
        message: "No search term extracted for Wikipedia.",
        duration: 0,
      },
    };
  }

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleaned
    )}&format=json&origin=*`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Wikipedia API returned status ${res.status}`);
    }
    const data = await res.json();
    const items = data?.query?.search || [];
    
    const results: WikipediaResult[] = items.slice(0, 3).map((item: any) => ({
      title: item.title,
      snippet: item.snippet.replace(/<span class="searchmatch">/g, "").replace(/<\/span>/g, ""),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
    }));

    const duration = Date.now() - startTime;
    return {
      results,
      step: {
        id: "wikipedia",
        title: "Wikipedia Knowledge Source",
        status: "success",
        message: `Successfully retrieved ${results.length} relevant articles from Wikipedia.`,
        duration,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      results: [],
      step: {
        id: "wikipedia",
        title: "Wikipedia Knowledge Source",
        status: "error",
        message: `Failed to search Wikipedia: ${error.message || error}`,
        duration,
      },
    };
  }
}

// Helper: Parse arXiv XML
function parseArxivXml(xml: string): ArxivResult[] {
  const results: ArxivResult[] = [];
  // Split by entry
  const entryParts = xml.split("<entry>");
  // First part is feed metadata, skip it
  for (let i = 1; i < entryParts.length; i++) {
    const entry = entryParts[i].split("</entry>")[0];
    
    // Extract ID/URL
    const idMatch = entry.match(/<id>(.*?)<\/id>/s);
    const url = idMatch ? idMatch[1].trim() : "";
    
    // Extract Title
    const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
    let title = titleMatch ? titleMatch[1].trim() : "Untitled arXiv Paper";
    title = title.replace(/\s+/g, " "); // collapse spacing
    
    // Extract Summary
    const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
    let summary = summaryMatch ? summaryMatch[1].trim() : "";
    summary = summary.replace(/\s+/g, " ");

    // Extract Published Date
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/s);
    const published = publishedMatch ? publishedMatch[1].trim().substring(0, 10) : undefined;
    
    // Extract Authors
    const authors: string[] = [];
    const authorBlocks = entry.split("<author>");
    for (let j = 1; j < authorBlocks.length; j++) {
      const authorBlock = authorBlocks[j].split("</author>")[0];
      const nameMatch = authorBlock.match(/<name>(.*?)<\/name>/s);
      if (nameMatch) {
        authors.push(nameMatch[1].trim());
      }
    }

    results.push({
      title,
      summary,
      url,
      authors,
      published,
    });
  }
  return results;
}

// Helper: Fetch arXiv publications
async function searchArxiv(query: string): Promise<{ results: ArxivResult[]; step: SearchStep }> {
  const startTime = Date.now();
  const cleaned = cleanQuery(query);
  if (!cleaned) {
    return {
      results: [],
      step: {
        id: "arxiv",
        title: "arXiv Scholarly Repository",
        status: "success",
        message: "No search term extracted for arXiv.",
        duration: 0,
      },
    };
  }

  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      cleaned
    )}&max_results=3`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`arXiv API returned status ${res.status}`);
    }
    const xmlText = await res.text();
    const results = parseArxivXml(xmlText);

    const duration = Date.now() - startTime;
    return {
      results,
      step: {
        id: "arxiv",
        title: "arXiv Scholarly Repository",
        status: "success",
        message: `Successfully retrieved ${results.length} scholarly papers from arXiv.org.`,
        duration,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      results: [],
      step: {
        id: "arxiv",
        title: "arXiv Scholarly Repository",
        status: "error",
        message: `Failed to search arXiv: ${error.message || error}`,
        duration,
      },
    };
  }
}

// Search & Synthesis API Endpoint
app.post("/api/search", async (req, res) => {
  const startTime = Date.now();
  const config: SearchQueryConfig = req.body;
  const { query, sources, temperature, thinkingLevel } = config;

  if (!query || query.trim() === "") {
    return res.status(400).json({
      status: "error",
      errorMessage: "Search query is required.",
    });
  }

  const thinkingSteps: SearchStep[] = [];
  
  // Step 1: Analysis and Planning
  thinkingSteps.push({
    id: "analyze",
    title: "Request Analysis",
    status: "success",
    message: `Received query: "${query}". Initiated multi-agent search plan focusing on selected sources: ${Object.keys(sources)
      .filter((k) => sources[k as keyof typeof sources])
      .join(", ")}.`,
    duration: Date.now() - startTime,
  });

  let wikipediaResults: WikipediaResult[] = [];
  let arxivResults: ArxivResult[] = [];
  let googleSearchResults: GroundingSource[] = [];

  // Step 2 & 3: Run Searches
  const searchPromises: Promise<any>[] = [];

  if (sources.wikipedia) {
    searchPromises.push(
      searchWikipedia(query).then(({ results, step }) => {
        wikipediaResults = results;
        thinkingSteps.push(step);
      })
    );
  }

  if (sources.arxiv) {
    searchPromises.push(
      searchArxiv(query).then(({ results, step }) => {
        arxivResults = results;
        thinkingSteps.push(step);
      })
    );
  }

  // Await static API searches
  await Promise.all(searchPromises);

  // Step 4: Synthesize & Ground with Gemini
  const synthesisStart = Date.now();
  thinkingSteps.push({
    id: "synthesize-start",
    title: "Context Synthesis",
    status: "searching",
    message: "Structuring knowledge context and sending reasoning request to Gemini 3.5 LLM.",
  });

  if (!ai) {
    // Graceful error if API key is missing
    const totalDuration = Date.now() - startTime;
    const errorMsg = "Gemini API key is not configured on the server. Please add your GEMINI_API_KEY in Settings > Secrets.";
    thinkingSteps[thinkingSteps.length - 1] = {
      id: "synthesize-start",
      title: "Context Synthesis",
      status: "error",
      message: errorMsg,
      duration: Date.now() - synthesisStart,
    };
    return res.json({
      status: "error",
      errorMessage: errorMsg,
      thinkingSteps,
      wikipediaResults,
      arxivResults,
      googleSearchResults,
      timeTaken: totalDuration,
      modelUsed: "None",
      answer: "",
    } as SearchResponse);
  }

  try {
    // Construct rich grounding context prompt for the Gemini LLM
    let promptContext = `You are an expert multi-source search reasoning agent. The user is searching for: "${query}".\n\n`;

    if (wikipediaResults.length > 0) {
      promptContext += `=== WIKIPEDIA SEARCH CONTEXT ===\n`;
      wikipediaResults.forEach((w, idx) => {
        promptContext += `[Wikipedia Source ${idx + 1}] Title: ${w.title}\nSnippet: ${w.snippet}\nURL: ${w.url}\n\n`;
      });
    }

    if (arxivResults.length > 0) {
      promptContext += `=== ARXIV ACADEMIC PAPERS CONTEXT ===\n`;
      arxivResults.forEach((a, idx) => {
        promptContext += `[arXiv Source ${idx + 1}] Title: ${a.title}\nAuthors: ${a.authors.join(", ")}${a.published ? ` (Published: ${a.published})` : ""}\nSummary: ${a.summary}\nURL: ${a.url}\n\n`;
      });
    }

    promptContext += `=== INSTRUCTIONS ===
Synthesize the facts above along with your web search capabilities (if enabled). Provide a clear, highly engaging, and comprehensive answer to the user's query. 
Use Markdown formatting beautifully. Create structured sections, headers, bullet points, and highlight key terms where appropriate.
If a statement is backed by Wikipedia, cite it inline like this: [Wikipedia: Title] or [1].
If a statement is backed by arXiv, cite it inline like this: [arXiv: Title] or [2].
If you find more information via the web search grounding, cite it accordingly.
Keep the tone informative, professional, and helpful. Always provide a brief concluding synthesis.`;

    // Dynamic model selection based on the guidelines (complex text reasoning: gemini-3.5-flash)
    const modelName = "gemini-3.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: promptContext }],
        },
      ],
      config: {
        temperature: temperature,
        tools: sources.googleSearch ? [{ googleSearch: {} }] : [],
      },
    });

    const answer = response.text || "No response generated by the model.";

    // Extract Google Search grounding chunks if present
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && sources.googleSearch) {
      googleSearchResults = groundingChunks
        .map((chunk: any) => {
          if (chunk.web) {
            return {
              title: chunk.web.title || "Web Search Result",
              url: chunk.web.uri,
            };
          }
          return null;
        })
        .filter((c): c is GroundingSource => c !== null);
    }

    const synthesisDuration = Date.now() - synthesisStart;
    
    // Complete synthesis thinking step
    thinkingSteps[thinkingSteps.length - 1] = {
      id: "synthesize-start",
      title: "Context Synthesis & Generation",
      status: "success",
      message: `Gemini successfully reasoned over all inputs${sources.googleSearch ? " and queried Google Web Search" : ""}. Synthesized final comprehensive report.`,
      duration: synthesisDuration,
    };

    const totalTime = Date.now() - startTime;

    res.json({
      status: "success",
      answer,
      thinkingSteps,
      wikipediaResults,
      arxivResults,
      googleSearchResults,
      timeTaken: totalTime,
      modelUsed: modelName,
    } as SearchResponse);

  } catch (err: any) {
    const synthesisDuration = Date.now() - synthesisStart;
    thinkingSteps[thinkingSteps.length - 1] = {
      id: "synthesize-start",
      title: "Context Synthesis & Generation",
      status: "error",
      message: `Failed to synthesize response: ${err.message || err}`,
      duration: synthesisDuration,
    };

    const totalTime = Date.now() - startTime;
    res.json({
      status: "error",
      errorMessage: `Gemini error: ${err.message || err}`,
      answer: "",
      thinkingSteps,
      wikipediaResults,
      arxivResults,
      googleSearchResults,
      timeTaken: totalTime,
      modelUsed: "gemini-3.5-flash",
    } as SearchResponse);
  }
});

// Configure Vite or Static files depending on Environment
async function startApp() {
  if (process.env.NODE_ENV !== "production") {
    // In dev mode, mount Vite middleware to serve static React bundle with support for ESM
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LLM Search Engine server running on http://0.0.0.0:${PORT}`);
  });
}

startApp().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
