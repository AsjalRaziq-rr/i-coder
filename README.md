# i-coder

A powerful web-based IDE with AI assistance, built for modern development workflows.

## Features

### 🤖 AI-Powered Development
- **Multiple AI Models**: Groq (Llama), Codestral, OpenRouter support
- **Smart Code Generation**: AI creates and modifies files automatically
- **Auto Dev Server**: AI starts servers on port 3002 with auto-open in new tabs
- **Command Execution**: AI can run terminal commands

### 📁 File Management
- **File Explorer**: Tree view with folder dropdown
- **Upload Files**: Drag & drop or select multiple files
- **Download Project**: Export workspace as ZIP
- **File Tabs**: Multi-file editing with close buttons
- **Auto-save**: Changes saved automatically

### 💻 Code Editor
- **Syntax Highlighting**: JavaScript, Python, HTML, CSS support
- **CodeMirror Integration**: Professional editing experience
- **Live Preview**: Built-in app preview panel
- **Responsive Design**: Works on desktop and mobile

### 🖥️ Terminal & Chat
- **Integrated Terminal**: Execute commands directly
- **WebContainer Support**: Run dev servers in browser
- **Full-height Chat**: Enhanced AI chat panel
- **Smart UI**: Buttons move when panels open

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Set Environment Variables**
Create `.env` file:
```
PORT=8080
CODESTRAL_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

3. **Start Server**
```bash
npm start
```

4. **Open IDE**
Navigate to `http://localhost:8080`

## Usage

### AI Chat
- Click "AI Chat" button to open chat panel
- Switch between AI models in dropdown
- Ask AI to create files, run commands, or build apps
- AI automatically uses port 3002 for dev servers

### File Operations
- **New File**: Click "+ New File" button
- **Upload**: Click "📁 Upload Files" to add existing files
- **Download**: Click "💾 Download Project" to export as ZIP
- **Edit**: Click any file to open in editor
- **Close**: Click "×" on file tabs to close

### Terminal
- Click "Terminal" button to open terminal
- Run any command (npm, git, etc.)
- Dev servers auto-open in new tabs
- WebContainer support for browser-based execution

### Preview
- Click "🔍 Preview App" to see your app
- Opens in side panel or new tab
- Live updates as you edit files

## API Endpoints

- `GET /` - Main IDE interface
- `POST /api/chat` - AI chat interactions
- `GET /api/files` - List workspace files
- `POST /api/files` - Create/update files
- `DELETE /api/files/*` - Delete files
- `POST /api/terminal` - Execute terminal commands
- `GET /api/download-project` - Download workspace as ZIP

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, CodeMirror
- **AI**: OpenAI API (Groq, Codestral, OpenRouter)
- **Containerization**: WebContainer API
- **Styling**: CSS with gradients and glassmorphism

## Development

### Project Structure
```
i-coder/
├── frontend/
│   └── index.html          # Main UI
├── workspace/              # User project files
├── server.js              # Main server
├── package.json           # Dependencies
└── .env                   # Environment variables
```

### Key Features Implementation
- **AI Integration**: Uses OpenAI-compatible APIs
- **File System**: Express static serving with API endpoints
- **Real-time Updates**: Auto-refresh file explorer
- **Responsive Design**: CSS media queries for mobile
- **Security**: API key validation and CORS protection

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - feel free to use and modify!

---

Built with ❤️ for developers who want AI-powered coding assistance.