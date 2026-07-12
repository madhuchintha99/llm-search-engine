# LLM Search Engine

An intelligent AI-powered search assistant that utilizes multi-source agent reasoning across Google Search, Wikipedia, and arXiv.

## Overview

This project combines the power of Large Language Models (LLMs) with multi-source information retrieval to provide intelligent, context-aware search capabilities. The system uses agent-based reasoning to synthesize information from multiple sources and deliver comprehensive, accurate results.

## Features

- **Multi-Source Integration**: Search across Google Search, Wikipedia, and arXiv simultaneously
- **Agent-Based Reasoning**: Intelligent agents analyze and synthesize information from multiple sources
- **LLM-Powered**: Leverages advanced language models for natural language understanding and response generation
- **Context-Aware**: Understands complex queries and provides relevant, contextual results

## Architecture

- **Search Agents**: Specialized agents for each information source
- **LLM Core**: Advanced language model for query understanding and response synthesis
- **Information Aggregation**: Combines and deduplicates results from multiple sources
- **Response Generation**: Generates comprehensive answers based on aggregated information

## Installation

```bash
# Clone the repository
git clone https://github.com/madhuchintha99/llm-search-engine.git
cd llm-search-engine

# Install dependencies
pip install -r requirements.txt

# Run the search engine
python main.py

OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here

Technologies
LLMs: OpenAI GPT models
Search APIs: Google Search, Wikipedia API, arXiv API
Agent Framework: LangChain or similar
Language: Python
