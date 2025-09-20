const API_BASE = 'http://localhost:3001/api';

export const backendService = {
  // File operations
  async saveFile(filePath: string, content: string) {
    const response = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, content })
    });
    return response.json();
  },

  async readFile(filePath: string) {
    const response = await fetch(`${API_BASE}/files/${filePath}`);
    return response.json();
  },

  async deleteFile(filePath: string) {
    const response = await fetch(`${API_BASE}/files/${filePath}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async listFiles() {
    const response = await fetch(`${API_BASE}/files`);
    return response.json();
  },

  // Command execution
  async executeCommand(command: string) {
    const response = await fetch(`${API_BASE}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    return response.json();
  }
};