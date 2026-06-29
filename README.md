# 🚀 Auto-Pilot SEO RAG Generator (Retail & Sneakers Edition)



A lightweight, automated Proof of Concept (PoC) built to solve a massive digital marketing bottleneck: **generating thousands of highly optimized, fact-checked SEO product descriptions at scale.**



## 🛑 The Problem

Managing SEO for an e-commerce platform with 2,000+ SKUs (especially in fast-moving niches like sneakers and fashion) is a logistical nightmare. Manual copywriters burn hundreds of hours writing repetitive descriptions, and standard LLMs hallucinate product specs because they lack real-time data access.



## 💡 The Solution

This tool uses a **Retrieval-Augmented Generation (RAG)** pipeline. Instead of just "guessing" the specs, the machine searches the live internet for exact product details, then writes a 600-word SEO-optimized article based on current market facts.



### ⚙️ How It Works (The Flow)

1. **Bulk Input:** User uploads a `.csv` file containing raw product names (e.g., "Air Jordan 1 Retro High OG Chicago").

2. **Real-Time Retrieval:** The backend calls the **Tavily API** to scrape the top Google search results for that specific keyword.

3. **AI Generation:** The scraped facts are fed into **Groq (Llama 3 70B)** with a strictly engineered prompt to output a structured HTML article.

4. **Export:** The results are instantly exportable back to a spreadsheet for CMS bulk-upload.



## 🛠️ Tech Stack

*   **Frontend:** Pure HTML/JS/CSS (Vanilla)

*   **Backend:** Node.js, Express.js

*   **AI & Search API:** Groq (Llama 3 70B), Tavily Search API

*   **Rate Limiting/Quota:** Upstash Redis (For handling client-side generation limits)



## 💻 How to Run Locally

Since this is a local PoC, you can run it on your own machine:



1. Clone this repository.

2. Run `npm install` to install dependencies.

3. Create a `.env` file in the root directory and add your API keys:

   ```env

   GROQ_API_KEY=your_groq_key

   TAVILY_API_KEY=your_tavily_key

   UPSTASH_REDIS_REST_URL=your_upstash_url

   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
