// groq_request.mjs
// Reads the Groq API token from ~/groq-api.txt and makes a test request.

import fs from 'fs';
import path from 'path';

const tokenPath = path.resolve('/home/salmarina/groq-api.txt');
const token = fs.readFileSync(tokenPath, 'utf-8').trim();

if (!token) {
  console.error('Groq API token not found');
  process.exit(1);
}

const payload = {
  model: 'mixtral-8x7b-32768', // example Groq model
  messages: [{ role: 'user', content: 'Hello, Groq!' }],
  temperature: 0.7,
};

(async () => {
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    console.log('Groq response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error calling Groq API:', err);
  }
})();
