import { Mistral } from '@mistralai/mistralai';


const mistralClient = new Mistral({
  apiKey: import.meta.env.VITE_MISTRAL_API_KEY,
});


export interface FileOperation {
  type: 'read' | 'write' | 'create' | 'delete';
  path: string;
  content?: string;
}


export interface CommandOperation {
  type: 'execute';
  command: string;
}


export interface MistralResponse {
  message: string;
  fileOperations?: FileOperation[];
  commandOperations?: CommandOperation[];
  codeBlocks?: {
    language: string;
    code: string;
    filename?: string;
  }[];
}


const SYSTEM_PROMPT = `You are a coding assistant with access to file system operations and command execution. 

IMPORTANT: You must ALWAYS respond with valid JSON in this exact format:
{
  "message": "Your response message to the user",
  "fileOperations": [
    {
      "type": "read|write|create|delete",
      "path": "filename.ext",
      "content": "file content (only for write/create)"
    }
  ],
  "commandOperations": [
    {
      "type": "execute",
      "command": "command to run"
    }
  ],
  "codeBlocks": [
    {
      "language": "javascript|html|css|etc",
      "code": "code content",
      "filename": "optional filename"
    }
  ]
}

Available tools:
1. File Operations:
   - read: Read file content
   - write: Modify existing file
   - create: Create new file
   - delete: Delete file

2. Command Operations:
   - execute: Run shell commands (npm install, build commands, etc.)

Rules:
- ALWAYS respond with valid JSON only
- Include helpful explanations in the "message" field
- If npm install fails with ENOTEMPTY or corruption errors, use "rm -rf node_modules package-lock.json && npm install" instead
- Use commandOperations for package installations or builds
- Include code examples in codeBlocks when helpful
- when you update any file content make sure to just update only that file not the whole project files`
;


export async function queryMistral(prompt: string): Promise<MistralResponse> {
  try {
    const response = await mistralClient.chat.complete({
      model: "codestral-latest",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      maxTokens: 2048,
      temperature: 0.7
    });


    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Mistral API');
    }
    const trimmedContent = typeof content === 'string' ? content.trim() : content.toString().trim();
    // Parse JSON response - handle code blocks
    let jsonContent = trimmedContent;
    
    // Extract JSON from code blocks if present
    const jsonMatch = trimmedContent.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
    
    // If the entire response is JSON, use it directly
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      jsonContent = trimmedContent;
    }
    
    try {
      const jsonResponse = JSON.parse(jsonContent);
      return jsonResponse as MistralResponse;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', jsonContent);
      // If JSON parsing fails, extract just the message part
      let cleanMessage = trimmedContent;
      if (cleanMessage.includes('"message"')) {
        const messageMatch = cleanMessage.match(/"message"\s*:\s*"([^"]*)"/); 
        if (messageMatch) {
          cleanMessage = messageMatch[1];
        }
      }
      return {
        message: cleanMessage.length > 500 ? 'I apologize, but I had trouble processing that request. Please try rephrasing.' : cleanMessage,
        fileOperations: [],
        commandOperations: [],
        codeBlocks: []
      };
    }
  } catch (error) {
    console.error('Mistral API error:', error);
    return {
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      fileOperations: [],
      commandOperations: [],
      codeBlocks: []
    };
  }
}