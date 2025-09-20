import React, { useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FileItem } from '../types';

interface EditorProps {
  file: FileItem | null;
  onContentChange: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ file, onContentChange }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true
      }
    });
  };

  if (!file) {
    return (
      <div className="flex-1 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-medium mb-2">Fast Web Code Editor</h3>
          <p>Select a file from the explorer to start editing</p>
          <p className="text-sm mt-2">or create a new file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-900">
      <MonacoEditor
        height="100%"
        language={file.language}
        value={file.content}
        onChange={(value) => onContentChange(value || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          contextmenu: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on'
        }}
      />
    </div>
  );
};