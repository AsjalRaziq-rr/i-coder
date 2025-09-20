import React, { useState, useCallback, useEffect } from 'react';
import { FileItem, Tab, EditorState, ChatMessage } from './types';
import { createInitialFiles, generateId } from './utils/fileSystem';
import { queryMistral } from './services/mistralService';
import { getWebContainer, mountFiles, runCommand, startDevServer } from './services/webcontainer';
import Editor from '@monaco-editor/react';

// Use relative paths - Vite proxy will handle routing to backend
const BACKEND_URL = 'http://localhost:3333';

function App() {
  const [state, setState] = useState<EditorState>(() => {
    const initialFiles = createInitialFiles();
    return {
      files: initialFiles,
      openTabs: [],
      activeTabId: null,
      selectedFileId: null,
      showPreview: false,
      showChat: false
    };
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', content: 'Hi! I can help you read/write files and execute commands. Try: "create a new file" or "run npm install"', isUser: false, timestamp: new Date() }
  ]);
  const [chatHistory, setChatHistory] = useState<string>('');
  const [devServerUrl, setDevServerUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<string>('editor');
  
  // Clear preview and sync current files on app load
  useEffect(() => {
    const clearAndSync = async () => {
      // Always clear preview directory first, then save only current files
      await saveFiles(true);
    };
    clearAndSync();
  }, []); // Run once on mount
  
  // Trigger immediate save to populate preview with current files
  useEffect(() => {
    if (state.files.length > 0) {
      saveFiles(true);
    }
  }, []);
  
  // Preview will only open when user clicks Preview button

  // Manual save function
  const saveFiles = async (clearFirst: boolean = false) => {
    if (state.files.length > 0) {
      try {
        await fetch(`${BACKEND_URL}/api/save-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: state.files, clearFirst })
        });
        console.log('Files saved successfully');
      } catch (error) {
        console.error('Save error:', error);
      }
    }
  };

  // Ctrl+S save functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFiles();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.files]);

  // Auto-save only for non-Vite projects
  useEffect(() => {
    const packageJson = state.files.find(f => f.name === 'package.json');
    const isViteProject = packageJson && packageJson.content.includes('vite');
    
    if (!isViteProject && state.files.length > 0) {
      const timeoutId = setTimeout(saveFiles, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [state.files]);

  // Tool functions
  const readFile = (path: string) => {
    const file = state.files.find(f => f.name === path);
    return file ? file.content : null;
  };

  const writeFile = (path: string, content: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => f.name === path ? { ...f, content } : f)
    }));
  };

  const createFile = (path: string, content: string = '') => {
    const newFile: FileItem = {
      id: generateId(),
      name: path,
      content,
      language: path.split('.').pop() || 'text',
      isDirectory: false
    };
    setState(prev => ({ ...prev, files: [...prev.files, newFile] }));
  };

  const deleteFile = (path: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.name !== path)
    }));
  };

  const syncFiles = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/sync-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: state.files })
      });
    } catch (error) {
      console.error('File sync error:', error);
    }
  };

  const executeCommand = async (command: string) => {
    try {
      // Sync files before executing command
      await syncFiles();
      
      console.log('Trying to connect to:', `${BACKEND_URL}/api/execute`);
      const response = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command,
          workingDir: '/workspaces/codespaces-blank/project/preview'
        })
      });
      
      if (!response.ok) {
        return `Error: Server returned ${response.status}`;
      }
      
      const text = await response.text();
      try {
        const result = JSON.parse(text);
        const output = result.output || 'Command executed';
        return output;
      } catch (e) {
        return `Server response: ${text}`;
      }
    } catch (error) {
      return `Error: Cannot connect to command server. ${error}`;
    }
  };

  const executeAICommand = async (userMessage: string) => {
    const newUserMsg: ChatMessage = { id: generateId(), content: userMessage, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, newUserMsg]);

    // Update chat history
    const newHistory = chatHistory + `\nUser: ${userMessage}`;
    setChatHistory(newHistory);

    try {
      const prompt = `You are a coding assistant with file system access. 

IMPORTANT: Commands are executed in WebContainer (browser-based Node.js environment). Most npm commands work, but some system commands may have limitations.

Current files: ${state.files.map(f => f.name).join(', ')}

Chat history: ${newHistory}

User request: ${userMessage}

Respond with JSON containing:
- message: your response
- fileOperations: array of {type: "create"|"write"|"delete", path: "filename", content: "file content"}
- commandOperations: array of {type: "execute", command: "npm install" etc}

Use create for new files, write for updating existing files. Commands run in WebContainer environment.`;
      
      const mistralResponse = await queryMistral(prompt);
      
      // Execute file operations
      let operationResults = [];
      if (mistralResponse.fileOperations) {
        mistralResponse.fileOperations.forEach(op => {
          if (op.type === 'create') {
            createFile(op.path, op.content || '');
            operationResults.push(`✅ Created ${op.path}`);
          }
          if (op.type === 'write') {
            writeFile(op.path, op.content || '');
            operationResults.push(`✅ Updated ${op.path}`);
          }
          if (op.type === 'delete') {
            deleteFile(op.path);
            operationResults.push(`✅ Deleted ${op.path}`);
          }
        });
        
        // Always clear preview directory and save only current files
        saveFiles(true);
      }

      // Execute command operations
      if (mistralResponse.commandOperations) {
        for (const cmd of mistralResponse.commandOperations) {
          if (cmd.type === 'execute') {
            const result = await executeCommand(cmd.command);
            operationResults.push(`⚙️ Executed: ${cmd.command}\n${result}`);
          }
        }
      }

      const response = mistralResponse.message + (operationResults.length > 0 ? '\n\n' + operationResults.join('\n') : '');
      const aiMsg: ChatMessage = { id: generateId(), content: response, isUser: false, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      
      // Update chat history with AI response
      setChatHistory(prev => prev + `\nAI: ${response}`);
    } catch (error) {
      const errorMsg: ChatMessage = { id: generateId(), content: 'Error connecting to AI service. Please try again.', isUser: false, timestamp: new Date() };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleFileSelect = useCallback((file: FileItem) => {
    setState(prev => {
      const existingTab = prev.openTabs.find(tab => tab.id === file.id);
      
      if (existingTab) {
        return {
          ...prev,
          activeTabId: file.id,
          selectedFileId: file.id
        };
      } else {
        const newTab: Tab = {
          id: file.id,
          name: file.name,
          isDirty: false
        };
        
        return {
          ...prev,
          openTabs: [...prev.openTabs, newTab],
          activeTabId: file.id,
          selectedFileId: file.id
        };
      }
    });
  }, []);

  const activeFile = state.files.find(f => f.id === state.activeTabId);

  const togglePreview = () => setState(prev => ({ ...prev, showPreview: !prev.showPreview }));
  const toggleChat = () => setState(prev => ({ ...prev, showChat: !prev.showChat }));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1f2937', color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ backgroundColor: '#374151', borderBottom: '1px solid #4b5563', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Fast Web Code Editor</h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setCurrentPage('editor')}
              style={{ padding: '0.5rem 1rem', backgroundColor: currentPage === 'editor' ? '#2563eb' : 'transparent', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              📝 Editor
            </button>
            <button 
              onClick={() => setCurrentPage('files')}
              style={{ padding: '0.5rem 1rem', backgroundColor: currentPage === 'files' ? '#2563eb' : 'transparent', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              📁 Files
            </button>
            <button 
              onClick={() => setCurrentPage('terminal')}
              style={{ padding: '0.5rem 1rem', backgroundColor: currentPage === 'terminal' ? '#2563eb' : 'transparent', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              💻 Terminal
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={togglePreview} style={{ padding: '0.5rem 1rem', backgroundColor: state.showPreview ? '#2563eb' : '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Preview</button>
          <button onClick={toggleChat} style={{ padding: '0.5rem 1rem', backgroundColor: state.showChat ? '#059669' : '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>AI Chat</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {currentPage === 'editor' && (
          <>
        <div style={{ width: '250px', backgroundColor: '#1f2937', borderRight: '1px solid #4b5563', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#d1d5db', margin: 0 }}>FILES</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  const fileName = prompt('Enter file name (e.g., app.js):');
                  if (fileName) {
                    createFile(fileName, '');
                  }
                }}
                style={{ padding: '0.25rem', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                title="New File"
              >
                +
              </button>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  Array.from(e.target.files || []).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      createFile(file.name, event.target?.result as string || '');
                    };
                    reader.readAsText(file);
                  });
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <button
                onClick={() => document.getElementById('file-upload')?.click()}
                style={{ padding: '0.25rem', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                title="Upload Files"
              >
                ↑
              </button>
            </div>
          </div>
          {state.files.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileSelect(file)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '0.25rem',
                backgroundColor: state.selectedFileId === file.id ? '#374151' : 'transparent',
                color: state.selectedFileId === file.id ? '#60a5fa' : '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>📄 {file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${file.name}?`)) {
                    deleteFile(file.name);
                  }
                }}
                style={{ padding: '0.25rem', backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                title="Delete File"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: state.showPreview ? '50%' : '100%' }}>
          {state.openTabs.length > 0 && (
            <div style={{ backgroundColor: '#374151', borderBottom: '1px solid #4b5563', display: 'flex' }}>
              {state.openTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setState(prev => ({ ...prev, activeTabId: tab.id, selectedFileId: tab.id }))}
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    backgroundColor: state.activeTabId === tab.id ? '#1f2937' : 'transparent',
                    borderRight: '1px solid #4b5563',
                    color: state.activeTabId === tab.id ? '#60a5fa' : '#d1d5db'
                  }}
                >
                  {tab.name}
                </div>
              ))}
            </div>
          )}

          <div style={{ flex: 1, padding: '1rem', backgroundColor: '#111827' }}>
            {activeFile ? (
              <div>
                <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>{activeFile.name}</h3>
                <Editor
                  height="400px"
                  language={activeFile.language}
                  value={activeFile.content}
                  onChange={(value) => {
                    setState(prev => ({
                      ...prev,
                      files: prev.files.map(file =>
                        file.id === activeFile.id ? { ...file, content: value || '' } : file
                      )
                    }));
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                  }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '2rem' }}>
                <p>Select a file to start editing</p>
              </div>
            )}
          </div>
        </div>

        {state.showPreview && (
          <div style={{ width: '50%', borderLeft: '1px solid #4b5563', backgroundColor: '#111827', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', borderBottom: '1px solid #4b5563', fontSize: '0.875rem', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Preview</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={async () => {
                    setDevServerUrl(''); // Clear dev server
                    await saveFiles(true); // Clear preview and save current files
                    setState(prev => ({ ...prev })); // Force re-render
                  }}
                  style={{ padding: '0.25rem 0.5rem', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  title="Refresh Preview"
                >
                  🔄 Refresh
                </button>
                {devServerUrl && <span style={{ color: '#10b981', fontSize: '0.75rem' }}>🟢 Live Server</span>}
                {devServerUrl && (
                  <button
                    onClick={() => window.open(devServerUrl, '_blank')}
                    style={{ padding: '0.25rem 0.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    title="Open in new tab"
                  >
                    ↗️ Full Preview
                  </button>
                )}
              </div>
            </div>
            
            <iframe
              key={devServerUrl || state.files.map(f => f.name + f.content.length).join('')}
              src={devServerUrl ? `${devServerUrl}?t=${Date.now()}` : (() => {
                // For static HTML projects, serve files
                const htmlFile = state.files.find(f => f.name === 'index.html');
                if (!htmlFile) {
                  return 'data:text/html,<div style="padding:2rem;font-family:system-ui"><h2>No Preview Available</h2><p>Create an index.html file or start a dev server to see preview.</p></div>';
                }
                
                return '/preview/index.html?t=' + Date.now();
              })()}
              style={{ width: '100%', flex: 1, border: 'none', backgroundColor: 'white' }}
              onLoad={() => {
                // Refresh preview after a delay for Vite projects
                const packageJson = state.files.find(f => f.name === 'package.json');
                const isViteProject = packageJson && packageJson.content.includes('vite');
                if (isViteProject && !devServerUrl) {
                  setTimeout(() => {
                    setState(prev => ({ ...prev })); // Force re-render
                  }, 3000);
                }
              }}
            />
            
            {/* Terminal at bottom */}
            <div style={{ height: '200px', borderTop: '1px solid #4b5563', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', fontSize: '0.75rem', fontWeight: '500' }}>Terminal</div>
              <div style={{ flex: 1, padding: '0.5rem', fontFamily: 'Monaco, Consolas, monospace', fontSize: '12px', color: '#00ff00', overflow: 'auto' }}>
                <div>$ Ready to execute commands</div>
                {messages.filter(msg => !msg.isUser && msg.content.includes('⚙️ Executed:')).slice(-5).map((msg, idx) => (
                  <div key={idx} style={{ marginTop: '0.25rem', color: '#ffffff' }}>
                    {msg.content.split('\n').filter(line => line.includes('⚙️ Executed:') || (!line.includes('✅') && !line.includes('🌐'))).join('\n')}
                  </div>
                ))}
              </div>
              <div style={{ padding: '0.5rem', borderTop: '1px solid #333' }}>
                <input
                  type="text"
                  placeholder="Enter command (e.g., npm install, ls, git status)..."
                  style={{ width: '100%', padding: '0.25rem', backgroundColor: '#111', color: '#00ff00', border: '1px solid #333', borderRadius: '2px', fontFamily: 'Monaco, Consolas, monospace', fontSize: '12px', outline: 'none' }}
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        const result = await executeCommand(input.value.trim());
                        const terminalMsg: ChatMessage = { id: generateId(), content: `⚙️ Executed: ${input.value}\n${result}`, isUser: false, timestamp: new Date() };
                        setMessages(prev => [...prev, terminalMsg]);
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {state.showChat && (
          <div style={{ width: '300px', borderLeft: '1px solid #4b5563', backgroundColor: '#1f2937', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', borderBottom: '1px solid #4b5563', fontSize: '0.875rem', fontWeight: '500' }}>AI Chat</div>
            <div style={{ flex: 1, padding: '1rem', overflow: 'auto', maxHeight: '400px' }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ 
                  marginBottom: '0.5rem', 
                  padding: '0.5rem', 
                  backgroundColor: msg.isUser ? '#1e40af' : '#374151', 
                  borderRadius: '4px', 
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  <strong>{msg.isUser ? 'You' : 'AI'}:</strong> {msg.content}
                </div>
              ))}
            </div>
            <div style={{ padding: '1rem', borderTop: '1px solid #4b5563' }}>
              <input
                type="text"
                placeholder="Ask me anything..."
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '4px', outline: 'none' }}
                onKeyPress={async (e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      await executeAICommand(input.value.trim());
                      input.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
          </>
        )}
        
        {currentPage === 'files' && (
          <div style={{ flex: 1, padding: '2rem', backgroundColor: '#111827' }}>
            <h2 style={{ color: '#60a5fa', marginBottom: '1rem' }}>File Manager</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {state.files.map((file) => (
                <div key={file.id} style={{ padding: '1rem', backgroundColor: '#374151', borderRadius: '8px', cursor: 'pointer' }} onClick={() => handleFileSelect(file)}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                  <div style={{ fontWeight: '500' }}>{file.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{file.language}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>{file.content.length} chars</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {currentPage === 'terminal' && (
          <div style={{ flex: 1, padding: '2rem', backgroundColor: '#111827' }}>
            <h2 style={{ color: '#60a5fa', marginBottom: '1rem' }}>Terminal</h2>
            <div style={{ backgroundColor: '#000', padding: '1rem', borderRadius: '8px', fontFamily: 'Monaco, Consolas, monospace', fontSize: '14px' }}>
              <div style={{ color: '#00ff00', marginBottom: '1rem' }}>$ Welcome to Fast Web Code Editor Terminal</div>
              <div style={{ color: '#ffffff' }}>Use the AI Chat to execute commands</div>
              <div style={{ color: '#888', marginTop: '1rem' }}>Available commands: npm, node, git, ls, cd, mkdir, etc.</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#374151', borderTop: '1px solid #4b5563', padding: '0.25rem 1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
        {activeFile ? `${activeFile.name} • ${activeFile.language}` : 'No file selected'} • {state.files.length} files
        {state.showPreview && <span style={{ color: '#10b981' }}> • Preview Active</span>}
        {state.showChat && <span style={{ color: '#3b82f6' }}> • AI Chat Active</span>}
        <span style={{ color: '#fbbf24' }}> • Press Ctrl+S to save</span>
      </div>
    </div>
  );
}

export default App;