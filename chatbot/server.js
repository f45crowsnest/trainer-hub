// server.js
// The chatbot backend: the "locked drawer" that holds the API key.
// The webpage talks to this; this talks to Claude. The key never leaves here.

import 'dotenv/config';              // loads ANTHROPIC_API_KEY from the .env file
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

// The bot's brain: read the system prompt from the file once, when the server starts.
const SYSTEM_PROMPT = readFileSync(new URL('./system-prompt.md', import.meta.url), 'utf8');

// The Anthropic client automatically reads ANTHROPIC_API_KEY from the environment.
const claude = new Anthropic();

const app = express();
app.use(cors());                    // lets the trainer hub website call this backend
app.use(express.json());            // reads JSON out of incoming requests

// Serve the front-end test files (the widget + animation) from the public folder.
// This is only for local testing. In production these live on the trainer hub itself.
const publicDir = fileURLToPath(new URL('./public', import.meta.url));
app.use(express.static(publicDir));

// A simple health check, so you can open the server in a browser and see it's alive.
app.get('/', (req, res) => {
  res.send('Trainer Hub chatbot backend is running.');
});

// The main endpoint. The chat widget sends the user's message (and recent history) here.
app.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Guard: we need a message to answer.
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Please include a "message".' });
    }

    // Build the conversation: the recent history first, then the new question.
    const messages = [...history, { role: 'user', content: message }];

    const response = await claude.messages.create({
      model: 'claude-haiku-4-5',    // cheap and fast, perfect for an FAQ bot
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // caches the brain to cut cost as it grows
        },
      ],
      messages,
    });

    // Pull the text out of Claude's reply and send it back to the webpage.
    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Chatbot backend listening on http://localhost:${PORT}`);
});
