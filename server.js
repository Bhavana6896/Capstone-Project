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

// Dynamic Gemini SDK initialization helper
function getAIClient(req) {
  // Reload env variables from .env dynamically on each request to pick up changes without restarting
  try {
    dotenv.config({ override: true });
  } catch (e) {
    console.error('Failed to reload .env:', e);
  }
  
  const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_actual_key_from_aistudio' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// POST endpoint for AI suggestions
app.post('/api/suggest', async (req, res) => {
  try {
    const { score, lowestCategory } = req.body;
    
    const ai = getAIClient(req);
    if (!ai) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is missing. Please configure it in .env or in the chatbot settings.' 
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
    
    const ai = getAIClient(req);
    if (!ai) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is missing. Please configure it in .env or in the chatbot settings.' 
      });
    }

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const systemInstruction = "You are a gentle, encouraging well-being assistant for the Bhavana app. Keep responses brief, empathetic, and helpful. Do not diagnose or give medical advice.";

    // Format history for the Gemini API
    // Ensure we only include previous turns (exclude the current message if it's at the end)
    let historyToFormat = history || [];
    if (historyToFormat.length > 0 && historyToFormat[historyToFormat.length - 1].text === message) {
      historyToFormat = historyToFormat.slice(0, -1);
    }
    const formattedHistory = historyToFormat.map(msg => ({
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
