const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Initialize Gemini SDK if key is available
let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// POST endpoint for AI suggestions
app.post('/api/suggest', async (req, res) => {
  try {
    const { score, lowestCategory } = req.body;
    
    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is missing. Please configure it in .env' 
      });
    }

    if (score === undefined || !lowestCategory) {
      return res.status(400).json({ error: 'score and lowestCategory are required' });
    }

    const prompt = `Given mood score ${score}/5 and lowest category ${lowestCategory}, give exactly one suggested activity in one sentence. No diagnosis, no mental health language, no follow-up questions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ suggestion: response.text });
  } catch (error) {
    console.error('Error fetching AI suggestion:', error);
    res.status(500).json({ error: 'Failed to fetch AI suggestion' });
  }
});

// POST endpoint for AI Chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is missing. Please configure it in .env' 
      });
    }

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const systemInstruction = "You are a gentle, encouraging well-being assistant for the Bhavana app. Keep responses brief, empathetic, and helpful. Do not diagnose or give medical advice.";

    // Format history for the Gemini API
    // The history should be an array of objects with `role` ("user" or "model") and `parts` (array of text parts).
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Error fetching AI chat response:', error);
    res.status(500).json({ error: 'Failed to fetch AI chat response' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Bhavana server running at http://localhost:${port}`);
});
