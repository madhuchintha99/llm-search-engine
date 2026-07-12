import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Search,
  Loader2,
  BookOpen,
  FileText,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Compass,
  RefreshCw,
  Trash2,
  Settings,
  History,
  Info,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { SearchQueryConfig, SearchResponse, SavedSearch, SearchStep } from "./types";

// Pre-configured elegant template search suggestions
const SEARCH_PRESETS = [
  {
    title: "Superconductivity breakthroughs",
    query: "Latest developments and materials in room temperature superconductors",
    desc: "Checks arXiv papers & Google Search for state of the art results.",
  },
  {
    title: "GPT-4 & LLM Architecture",
    query: "Compare transformer attention mechanism enhancements in modern LLMs",
    desc: "Retrieves Wikipedia and academic articles on machine learning theory.",
  },
  {
    title: "Quantum Entanglement",
    query: "Explain quantum entanglement and quantum teleportation in simple terms",
    desc: "Synthesizes physics fundamentals with web grounding.",
  },
  {
    title: "James Webb discoveries",
    query: "Most significant astronomical discoveries of the James Webb Space Telescope",
    desc: "Combines latest space news grounding with academic summaries.",
  },
];

export default function App() {
  // Config state
  const [query, setQuery] = useState("");
  const [googleSearch, setGoogleSearch] = useState(true);
  const [wikipedia, setWikipedia] = useState(true);
  const [arxiv, setArxiv] = useState(true);
  const [temperature, setTemperature] = useState(0.4);
  const [thinkingLevel, setThinkingLevel] = useState<"HIGH" | "LOW" | "MINIMAL">("HIGH");

  // App running state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  // UI state
  const [showConfig, setShowConfig] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentRunningSteps, setCurrentRunningSteps] = useState<SearchStep[]>([]);

  // Load saved searches from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("llm_saved_searches");
      if (stored) {
        setSavedSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load search history", e);
    }
  }, []);

  // Save searches helper
  const saveSearchToHistory = (newSearch: SavedSearch) => {
    const updated = [newSearch, ...savedSearches.filter((s) => s.id !== newSearch.id)].slice(0, 15);
    setSavedSearches(updated);
    try {
      localStorage.setItem("llm_saved_searches", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  };

  // Delete search from history
  const deleteSearchFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    try {
      localStorage.setItem("llm_saved_searches", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to update search history", e);
    }
    if (selectedSavedId === id) {
      setSelectedSavedId(null);
      setResponse(null);
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fire Search Request
  const handleSearch = async (searchQuery: string = query) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedSavedId(null);

    // Initial simulated/placeholder running steps for progress updates
    const initialSteps: SearchStep[] = [
      {
        id: "analyze",
        title: "Request Analysis",
        status: "searching",
        message: "Parsing query scope, extracting entities, and preparing multi-source retrieval layout.",
      },
    ];

    if (wikipedia) {
      initialSteps.push({
        id: "wikipedia",
        title: "Wikipedia Knowledge Source",
        status: "pending",
        message: "Waiting for analysis to complete.",
      });
    }
    if (arxiv) {
      initialSteps.push({
        id: "arxiv",
        title: "arXiv Scholarly Repository",
        status: "pending",
        message: "Waiting for analysis to complete.",
      });
    }
    initialSteps.push({
      id: "synthesize-start",
      title: "Context Synthesis & Generation",
      status: "pending",
      message: "Awaiting retrieval inputs for model synthesis.",
    });

    setCurrentRunningSteps(initialSteps);

    // Minor visual delays to simulate multi-agent step reasoning clearly
    const updateStepStatus = (id: string, status: SearchStep["status"], message: string, duration?: number) => {
      setCurrentRunningSteps((prev) =>
        prev.map((step) => (step.id === id ? { ...step, status, message, duration } : step))
      );
    };

    try {
      // Step 1: Simulated update that we completed analysis
      await new Promise((r) => setTimeout(r, 600));
      updateStepStatus(
        "analyze",
        "success",
        `Parsed question entities: "${trimmedQuery.substring(0, 40)}${trimmedQuery.length > 40 ? "..." : ""}"`,
        120
      );

      // Start actual retrieval steps
      if (wikipedia) {
        updateStepStatus("wikipedia", "searching", "Querying English Wikipedia database for related articles...");
      }
      if (arxiv) {
        updateStepStatus("arxiv", "searching", "Searching arXiv database for scholarly publications and preprints...");
      }

      // Perform API search post call
      const config: SearchQueryConfig = {
        query: trimmedQuery,
        sources: {
          googleSearch,
          wikipedia,
          arxiv,
        },
        temperature,
        thinkingLevel,
      };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        throw new Error(`Server returned status code: ${res.status}`);
      }

      const data: SearchResponse = await res.json();

      if (data.status === "error") {
        setError(data.errorMessage || "An unexpected error occurred during synthesis.");
        setResponse(data);
        setLoading(false);
        return;
      }

      // Feed backend-returned steps back to running steps for realistic display
      setCurrentRunningSteps(data.thinkingSteps);
      setResponse(data);

      // Add to history
      const saved: SavedSearch = {
        id: Date.now().toString(),
        query: trimmedQuery,
        sources: Object.keys(config.sources).filter((k) => config.sources[k as keyof typeof config.sources]),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        response: data,
      };
      saveSearchToHistory(saved);
      setSelectedSavedId(saved.id);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to contact the search API backend.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (presetQuery: string) => {
    setQuery(presetQuery);
    handleSearch(presetQuery);
  };

  const loadSavedSearch = (saved: SavedSearch) => {
    setSelectedSavedId(saved.id);
    setQuery(saved.query);
    setResponse(saved.response);
    setError(saved.response.status === "error" ? saved.response.errorMessage || "Search query failed" : null);
    
    // Set config values based on search settings
    setWikipedia(saved.sources.includes("wikipedia"));
    setArxiv(saved.sources.includes("arxiv"));
    setGoogleSearch(saved.sources.includes("googleSearch"));
  };

  const handleReset = () => {
    setQuery("");
    setResponse(null);
    setError(null);
    setSelectedSavedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900" id="app_root">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-4 py-3 shadow-xs" id="app_header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white p-2 rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">LLM Search Engine</h1>
              <p className="text-xs text-slate-500 font-medium">Multi-Source Intelligent Agent Reasoning</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-mono border border-indigo-100/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Gemini 3.5 Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6" id="app_main">
        {/* Left column: Controls & Search History */}
        <aside className="lg:col-span-1 flex flex-col gap-5" id="app_sidebar">
          {/* Engine Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4" id="sidebar_settings">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                <h2 className="font-display font-semibold text-slate-900 text-sm">Engine Parameters</h2>
              </div>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                id="btn_toggle_config"
              >
                {showConfig ? "Hide" : "Show"}
              </button>
            </div>

            {showConfig && (
              <div className="flex flex-col gap-4 text-sm" id="sidebar_config_panel">
                {/* Information Callout */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500 leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Choose research engines. Toggle Web Search for grounding support.</span>
                </div>

                {/* Agent Source Switches */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Sources</span>
                  
                  {/* Google Search */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-xs">Google Web Search</span>
                        <span className="text-[10px] text-slate-400">Live web grounding</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={googleSearch}
                      onChange={(e) => setGoogleSearch(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  {/* Wikipedia */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-xs">Wikipedia</span>
                        <span className="text-[10px] text-slate-400">General knowledge base</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={wikipedia}
                      onChange={(e) => setWikipedia(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  {/* arXiv */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-xs">arXiv.org Papers</span>
                        <span className="text-[10px] text-slate-400">Academic publications</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={arxiv}
                      onChange={(e) => setArxiv(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>

                {/* LLM Parameters */}
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">LLM Options</span>
                  
                  {/* Temperature */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Creativity (Temp)</span>
                      <span className="font-mono text-indigo-600 font-bold">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                      <span>Deterministic</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Thinking Modes */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-xs font-medium text-slate-700">Reasoning Depth</span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                      {(["HIGH", "LOW", "MINIMAL"] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setThinkingLevel(level)}
                          className={`text-[10px] font-bold py-1 px-1.5 rounded-md transition-all ${
                            thinkingLevel === level
                              ? "bg-white text-indigo-600 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex-1 flex flex-col gap-3 min-h-[250px]" id="sidebar_history">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h2 className="font-display font-semibold text-slate-900 text-sm">Recent Queries</h2>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-bold">
                {savedSearches.length}
              </span>
            </div>

            {savedSearches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Compass className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Your search history will appear here. No previous sessions recorded.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[350px] flex flex-col gap-1.5 pr-1" id="history_list">
                {savedSearches.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadSavedSearch(item)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 group ${
                      selectedSavedId === item.id
                        ? "bg-indigo-50/50 border-indigo-200 text-indigo-900"
                        : "bg-slate-50/50 hover:bg-slate-100/50 border-slate-150 text-slate-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate pr-1">{item.query}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-slate-400 font-medium">{item.timestamp}</span>
                        <div className="flex gap-0.5">
                          {item.sources.map((src) => (
                            <span
                              key={src}
                              className="w-1.5 h-1.5 rounded-full"
                              title={src}
                              style={{
                                backgroundColor:
                                  src === "googleSearch"
                                    ? "#3b82f6"
                                    : src === "wikipedia"
                                    ? "#10b981"
                                    : "#f97316",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteSearchFromHistory(item.id, e)}
                      className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete search record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right column: Search Panel & Active Results */}
        <section className="lg:col-span-3 flex flex-col gap-6" id="app_content">
          {/* Core Search Area Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col gap-4" id="search_input_card">
            <h2 className="font-display font-semibold text-slate-900 text-base md:text-lg flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-500" />
              What are you researching today?
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all"
              id="search_form"
            >
              <Search className="w-5 h-5 text-slate-400 ml-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Ask anything, from medical queries to transformer parameters..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                className="flex-1 bg-transparent text-slate-800 text-sm md:text-base outline-none py-1.5 px-1 placeholder-slate-400"
                id="search_input_box"
              />
              
              {query && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors text-xs font-semibold mr-1"
                  id="btn_clear_input"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-indigo-600 text-white font-semibold text-xs md:text-sm py-2 px-4 rounded-xl shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                id="btn_submit_search"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <span>Reason</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Presets suggestions shown when there is no response/loading */}
            {!loading && !response && (
              <div className="flex flex-col gap-2.5 mt-2" id="search_presets">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Suggested Research Queries</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SEARCH_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(p.query)}
                      className="text-left p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50/40 hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{p.query}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reasoning / Agent Activity Logger (When Loading) */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col gap-4" id="reasoning_logger">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <h3 className="font-display font-semibold text-slate-900 text-sm">Agent Chain of Thought</h3>
                </div>
                <span className="text-xs text-indigo-600 font-semibold animate-pulse">Running live reasoning...</span>
              </div>

              <div className="flex flex-col gap-4" id="reasoning_steps">
                {currentRunningSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`flex gap-3 items-start relative ${
                      idx < currentRunningSteps.length - 1 ? "pb-4" : ""
                    }`}
                  >
                    {/* Vertical connecting line */}
                    {idx < currentRunningSteps.length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-0 w-[1.5px] bg-slate-100" />
                    )}

                    {/* Step Icon */}
                    <div className="shrink-0 z-10">
                      {step.status === "success" && (
                        <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {step.status === "searching" && (
                        <div className="w-5.5 h-5.5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </div>
                      )}
                      {step.status === "pending" && (
                        <div className="w-5.5 h-5.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        </div>
                      )}
                      {step.status === "error" && (
                        <div className="w-5.5 h-5.5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800">{step.title}</span>
                        {step.duration !== undefined && (
                          <span className="font-mono text-slate-400 text-[10px] bg-slate-100 px-1 py-0.5 rounded">
                            {(step.duration / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-1 leading-relaxed">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Search Results Display */}
          {response && (
            <div className="flex flex-col gap-6" id="search_results_container">
              {/* Metadata strip */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Synthesized in <strong className="text-slate-700 font-bold">{(response.timeTaken / 1000).toFixed(2)}s</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    Model: <strong className="text-slate-700 font-bold">{response.modelUsed}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyToClipboard(response.answer)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Report</span>
                      </>
                    )}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleSearch()}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rerun Query</span>
                  </button>
                </div>
              </div>

              {/* Server/Gemini Error Alert (If Any) */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Retrieval or Model Error:</span>
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {/* Synthesized Response Markdown */}
              {response.answer && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4" id="answer_report">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <h3 className="font-display font-semibold text-slate-900 text-sm md:text-base">Synthesized Intelligent Response</h3>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed text-slate-700 markdown-body">
                    <ReactMarkdown>{response.answer}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Retrieved Knowledge Sources / Citations list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="retrieved_sources_grid">
                
                {/* Academic arXiv Publications */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <h4 className="font-display font-semibold text-slate-900 text-sm">Academic Publications (arXiv)</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {response.arxivResults.length} found
                    </span>
                  </div>

                  {response.arxivResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No matching arXiv scholarly publications retrieved for this query.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {response.arxivResults.map((paper, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1.5 hover:bg-slate-100/40 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{paper.title}</span>
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                            {paper.summary}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                            <span className="truncate pr-2">Authors: {paper.authors.slice(0, 2).join(", ")}{paper.authors.length > 2 ? " et al." : ""}</span>
                            {paper.published && <span className="shrink-0">{paper.published}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* General Knowledge Sources (Wikipedia & Google Search Grounding) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
                      <h4 className="font-display font-semibold text-slate-900 text-sm">Web Knowledge Sources</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {response.wikipediaResults.length + response.googleSearchResults.length} found
                    </span>
                  </div>

                  {response.wikipediaResults.length === 0 && response.googleSearchResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No general Wikipedia or Web search sources linked for this query.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Wikipedia articles */}
                      {response.wikipediaResults.map((wiki, idx) => (
                        <div key={`wiki-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1.5 hover:bg-slate-100/40 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-slate-800 line-clamp-1">{wiki.title}</span>
                            </div>
                            <a
                              href={wiki.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                            {wiki.snippet}
                          </p>
                          <div className="text-[9px] text-emerald-600 font-medium">Wikipedia Entry</div>
                        </div>
                      ))}

                      {/* Google search grounding sources */}
                      {response.googleSearchResults.map((ground, idx) => (
                        <div key={`ground-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/40 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium text-slate-800 truncate">{ground.title}</span>
                              <span className="text-[9px] text-slate-400 truncate">{ground.url}</span>
                            </div>
                          </div>
                          <a
                            href={ground.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </section>
      </main>

      {/* Sticky Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400 mt-auto" id="app_footer">
        <p className="font-medium">
          LLM Search Engine — Built using Langchain guidelines, Google GenAI SDK, Express, and React.
        </p>
        <p className="text-[10px] text-slate-350 mt-1">
          Server-side citations and direct link retrievals with Gemini 3.5.
        </p>
      </footer>
    </div>
  );
}
