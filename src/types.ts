export interface SearchStep {
  id: string;
  title: string;
  status: 'pending' | 'searching' | 'success' | 'error';
  message: string;
  duration?: number;
}

export interface WikipediaResult {
  title: string;
  snippet: string;
  url: string;
}

export interface ArxivResult {
  title: string;
  summary: string;
  url: string;
  authors: string[];
  published?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface SearchQueryConfig {
  query: string;
  sources: {
    googleSearch: boolean;
    wikipedia: boolean;
    arxiv: boolean;
  };
  temperature: number;
  thinkingLevel: 'HIGH' | 'LOW' | 'MINIMAL';
}

export interface SearchResponse {
  answer: string;
  thinkingSteps: SearchStep[];
  wikipediaResults: WikipediaResult[];
  arxivResults: ArxivResult[];
  googleSearchResults: GroundingSource[];
  timeTaken: number;
  modelUsed: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface SavedSearch {
  id: string;
  query: string;
  sources: string[];
  timestamp: string;
  response: SearchResponse;
}
