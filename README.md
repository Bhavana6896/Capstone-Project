# Bhavana — Daily Habit & Well-being Tracker

Bhavana is a beautiful, tactile, and non-clinical well-being tracking application. It helps you notice personal patterns, log daily wellness habits, and receive gentle nudges and conversations from **Bhavana**, your AI well-being assistant powered by the Google Gemini API.

---

## 🌟 Key Features

*   **Daily Habit Logging:** Check off daily actions in 4 core categories:
    *   💜 *Emotional Well-being* (Connecting with family, loved ones)
    *   ⚡ *Physical Fitness* (Exercising, walks)
    *   🧘 *Mental Resilience* (Completing tasks, journaling)
    *   🌱 *Financial Health* (Work productivity, mindful spending)
*   **Daily score & Focus Area:** Automatically calculates an overall daily score (1-5) and highlights your focus area (the category with the lowest score).
*   **Bhavana AI Suggestions:** Dynamically generates a single wellbeing suggestion from Gemini based on your daily summary.
*   **Bhavana Assistant (Chatbot):** A gentle, empathetic chatbot designed for brief, supportive conversations about your day.
*   **Monthly Progress Stats:** Interactive metrics tracking your average score, total days logged, and hit rate (days where score $\geq 3$) for the current month.
*   **Zero-Database Local Storage:** All log entries and chat histories are saved locally in your browser's `localStorage` for privacy.
*   **Flexible API Key Configuration:**
    *   **In-UI Settings:** Input and save your Gemini API key directly inside the chatbot settings panel (stored locally).
    *   **Server Environment:** Save the key permanently in a `.env` file with **automatic hot-reloading** (no server restart required!).

---

## 🛠️ Technology Stack

*   **Frontend:** Vanilla HTML5, CSS3 (Tactile gradients, cards, and smooth micro-animations), and modern JavaScript.
*   **Backend:** Express.js (Node.js server) for secure API routing.
*   **AI Integration:** `@google/genai` (SDK) accessing Gemini 2.5 Flash.

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Setup your API Key
You need a Gemini API Key from Google AI Studio. You can set it in one of two ways:

*   **Option A (File-based):** 
    Create a `.env` file in the root directory (or copy `.env.example`) and paste your key:
    ```env
    GEMINI_API_KEY=AIzaSyYourActualKeyHere
    ```
*   **Option B (In-Browser):** 
    Once the app is running, click the **Gear Icon (⚙️)** in the Chatbot header, paste your key, and click **Save**.

### 4. Run the Application
Start the Express server:
```bash
npm start
```
The application will be running at: **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

```
├── .agents/             # MCP settings & Agent-specific configurations
├── .env                 # API Credentials (git-ignored)
├── .env.example         # Template for environment variables
├── app.js               # Frontend UI interactions, calculations, and event handlers
├── index.html           # Main tracker layout & chatbot container markup
├── package.json         # Project metadata and dependencies
├── server.js            # Express server & Gemini API endpoints
└── style.css            # Styling system, tactile grids, and chatbot animations
```

---

## ⚙️ Error and Quota Management
*   **Rate Limits (HTTP 429):** The Gemini API Free Tier is limited to 15 Requests Per Minute (RPM). If you hit this limit, Bhavana will show a gentle alert: *"You have exceeded the Gemini API rate limit. Please wait a moment before sending another message."*
*   **Missing Credentials:** If no key is configured in either `.env` or settings, Bhavana will prompt you to set your API key by clicking the settings gear icon.
