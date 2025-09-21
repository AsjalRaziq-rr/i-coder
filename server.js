import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_DIR = './workspace';

const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Handle favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Ensure workspace directory exists
await fs.mkdir(WORKSPACE_DIR, { recursive: true });

// File operations
app.post('/api/files', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const files = await getDirectoryTree(WORKSPACE_DIR);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat with Codestral
app.post('/api/chat', async (req, res) => {
  try {
    const { message, currentFile, fileContent, files } = req.body;
    
    // Simple response for now - replace with actual Codestral API
    const response = await processWithCodestral(message, currentFile, fileContent, files);
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute commands
app.post('/api/execute', (req, res) => {
  const { command } = req.body;
  
  exec(command, { cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
    const output = stdout + stderr;
    res.send(output || 'Command completed');
  });
});

async function getDirectoryTree(dir, basePath = '') {
  const items = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          type: 'directory',
          path: relativePath,
          children: await getDirectoryTree(fullPath, relativePath)
        });
      } else {
        items.push({
          name: entry.name,
          type: 'file',
          path: relativePath
        });
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return items;
}

async function processWithCodestral(message, currentFile, fileContent, files) {
  if (!process.env.GROQ_API_KEY) {
    return `I'm a coding assistant. You asked: "${message}". I can help with code, but I need a GROQ_API_KEY environment variable to provide AI responses. For now, I can see you're working on ${currentFile || 'no file'} with files: ${files.join(', ')}.`;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a helpful coding assistant with access to file operations and command execution.' },
        { role: 'user', content: `Current file: ${currentFile || 'none'}\nFiles: ${files.join(', ')}\n\nUser: ${message}` }
      ],
      max_tokens: 2048,
      temperature: 0.7
    });

    return response.choices[0].message.content || 'No response from AI';
  } catch (error) {
    console.error('Groq API error:', error.message);
    return `API Error: ${error.message}. Please check your GROQ_API_KEY environment variable.`;
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});