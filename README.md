# Happy B! :) — Daily Habit & Well-being Tracker

Happy B! :) is a beautiful, tactile, and non-clinical daily well-being tracker. In an era of increasingly complex, notification-heavy health apps, it takes a step back to offer a mindful, calm, and lightweight tracking experience. 

Designed as a personal concierge for your wellness, Happy B! :) allows you to check off daily actions across four core well-being pillars, receive gentle AI-powered nudges, and converse with **Bhavana**, an empathetic well-being assistant.

---

## 🌟 Key Features

*   **Tactile Habit Logging & Dynamic Scoring:** Log daily wellness checkmarks across four categories:
    *   💜 *Emotional Well-being* (Connecting with family, loved ones)
    *   ⚡ *Physical Fitness* (Exercising, walks)
    *   🧘 *Mental Resilience* (Completing tasks, journaling)
    *   🌱 *Financial Health* (Work productivity, mindful spending)
*   **Focus Area Alert:** The application automatically detects which category has the lowest score and highlights it as your daily "Focus Area".
*   **Gemini AI Suggestions (with Caching):** Automatically generates a single-sentence wellness suggestion from Gemini. Suggestions are cached locally to conserve API quota and load instantly on page refresh.
*   **Bhavana Assistant (Chatbot):** A gentle, empathetic chatbot toggled via a floating action button (FAB) for supportive, non-clinical conversations. Includes a settings panel to manage your credentials and a **Clear Chat History** button.
*   **Interactive Monthly Well-being Calendar:** A visual calendar widget displaying logged days (color-coded by score) and unlogged past days. Click a logged day to view its summary, or click an unlogged past day to backfill entries.
*   **Monthly Progress Stats:** Interactive metrics tracking average scores, logging consistency, and hit rates.

---

## 🎓 Key Course Concepts Demonstrated

This project serves as a capstone demonstrating:
1.  **Model Context Protocol (MCP):** The application integrates with Google AI Studio endpoints to generate context-aware suggestions and conversational responses.
2.  **Security & Local-First Privacy:** A zero-database architecture. Habit logs and chat history are saved entirely in browser `localStorage`.
3.  **Antigravity IDE Build Process:** Conceptualized, architected, and "vibe coded" entirely using the Antigravity IDE.

---

## 🛠️ Technology Stack

*   **Frontend:** Vanilla HTML5, CSS3 (tactile gradients, card structures, active glowing borders, and animations), and JavaScript (ES6+).
*   **Backend:** Node.js & Express.js server acting as a secure API gateway.
*   **AI Integration:** `@google/genai` (SDK) accessing `gemini-2.5-flash`.

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Setup your API Key
Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/). You can configure it in one of two ways:
*   **Option A (File-based - Recommended):** Create a `.env` file in the root directory (using `.env.example` as a template) and add your key:
    ```env
    GEMINI_API_KEY=AQ.Ab8RN6KU5UTk...
    ```
    *Note: The server includes hot-reloading for environment variables, so updates to `.env` apply instantly without restarting the server.*
*   **Option B (In-Browser):** Click the **Gear Icon (⚙️)** in the Chatbot header, paste your key, and click **Save** (saved locally in your browser).

### 4. Run the Application
Start the Express server:
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔒 Security & API Key Privacy

*   **Git Ignored (`.env`):** Your API key is stored in the local `.env` file, which is listed in `.gitignore`. It will never be committed or uploaded to public repositories.
*   **Local Storage Sandbox:** Key settings saved in the UI are held purely inside your browser's private `localStorage`.
*   **Secure Gateway:** The Express backend hides your API credentials from the client-side network inspect console.

---

## 🔮 Future Roadmap

*   **Local LLMs:** Integrate WebLLM or local models running directly in the browser via WebGPU to remove external API calls entirely, maximizing privacy.
*   **Streaks & Gamification:** Implement local streak indicators and custom badges when users log entries consistently for 7 or 30 days.
*   **Visualization Dashboard:** Add local-rendering graphs (using Chart.js) to show weekly and monthly habit trends.
*   **Rich Media Logs:** Allow users to attach photos (e.g., of a nature walk or coffee with a friend) to their daily log entries.
*   **CSV Import/Export:** Implement backup functionality so users can export logs or share them with wellness professionals.
*   **Voice-First Interaction:** Integrate Speech-to-Text (STT) and Text-to-Speech (TTS) APIs for a completely hands-free wellness check.

---

## ⚠️ Prototype Note for Judges

> [!IMPORTANT]
> The live demo link shows the frontend UI layout and local storage features. Because the Gemini API calls run securely through a Node.js backend gateway, you must follow the **Quick Start** instructions above to run the fully functional AI assistant and suggestion box locally on your machine.
