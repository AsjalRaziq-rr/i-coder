import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_DIR = './workspace';
const chatHistory = [];

const groqClient = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY
});

const codestralClient = new OpenAI({
  baseURL: 'https://codestral.mistral.ai/v1',
  apiKey: process.env.CODESTRAL_API_KEY
});

let currentModel = 'groq'; // Default model

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

// Switch LLM model
app.post('/api/switch-model', (req, res) => {
  const { model } = req.body;
  if (model === 'groq' || model === 'codestral') {
    currentModel = model;
    res.json({ success: true, model: currentModel });
  } else {
    res.status(400).json({ error: 'Invalid model. Use "groq" or "codestral"' });
  }
});

// Get current model
app.get('/api/current-model', (req, res) => {
  res.json({ model: currentModel });
});

// Chat with AI
app.post('/api/chat', async (req, res) => {
  try {
    const { message, currentFile, fileContent, files } = req.body;
    
    const response = await processWithAI(message, currentFile, fileContent, files);
    
    res.json({ response, filesChanged: true });
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

async function processWithAI(message, currentFile, fileContent, files) {
  const client = currentModel === 'codestral' ? codestralClient : groqClient;
  const model = currentModel === 'codestral' ? 'codestral-latest' : 'llama-3.1-8b-instant';
  const apiKeyEnv = currentModel === 'codestral' ? 'CODESTRAL_API_KEY' : 'GROQ_API_KEY';
  
  if (!process.env[apiKeyEnv]) {
    return `I'm a coding assistant using ${currentModel.toUpperCase()}. You asked: "${message}". I need a ${apiKeyEnv} environment variable to provide AI responses.`;
  }

  
  const tools = [
    {
      type: 'function',
      function: {
        name: 'create_file',
        description: 'Create a new file with content',
        parameters: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Name of the file to create' },
            content: { type: 'string', description: 'Content of the file' }
          },
          required: ['filename', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'execute_command',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' }
          },
          required: ['command']
        }
      }
    }
  ];
  
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful coding assistant with access to file creation and command execution tools. When users ask you to create files, build apps, or run code, you MUST use the create_file and execute_command tools. For HTML files, use python3 -m http.server 8000 to start a web server.' },
      ...chatHistory,
      { role: 'user', content: `Current file: ${currentFile || 'none'}\nFiles: ${files.join(', ')}\n\nUser: ${message}` }
    ];
    
    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 2048,
      temperature: 0.7
    });

    const aiMessage = response.choices[0].message;
    
    // Add user message to history
    chatHistory.push({ role: 'user', content: message });
    
    let result = aiMessage.content || '';
    
    if (aiMessage.tool_calls) {
      for (const toolCall of aiMessage.tool_calls) {
        const { name, arguments: args } = toolCall.function;
        const params = JSON.parse(args);
        
        if (name === 'create_file') {
          await createFileFromAI(params.filename, params.content);
          result += `\n\nCreated file: ${params.filename}`;
        } else if (name === 'execute_command') {
          const output = await executeCommandFromAI(params.command);
          result += `\n\nExecuted: ${params.command}\nOutput: ${output}`;
        }
      }
    }
    
    // Add AI response to history
    chatHistory.push({ role: 'assistant', content: result });
    
    // Keep only last 20 messages to prevent memory issues
    if (chatHistory.length > 20) {
      chatHistory.splice(0, chatHistory.length - 20);
    }
    
    return result || 'No response from AI';
  } catch (error) {
    console.error(`${currentModel} API error:`, error.message);
    return `API Error: ${error.message}. Please check your ${apiKeyEnv} environment variable.`;
  }
}

async function createFileFromAI(filename, content) {
  try {
    const fullPath = path.join(WORKSPACE_DIR, filename);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  } catch (error) {
    console.error('Error creating file:', error);
  }
}

async function executeCommandFromAI(command) {
  return new Promise((resolve) => {
    exec(command, { cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
      resolve(stdout + stderr || 'Command completed');
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});