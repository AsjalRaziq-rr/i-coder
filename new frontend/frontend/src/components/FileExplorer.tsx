import React, { useState } from 'react';
import { Plus, Folder, File, Trash2, FolderOpen } from 'lucide-react';
import { FileItem } from '../types';
import { getFileIcon, generateId, getLanguageFromFileName } from '../utils/fileSystem';

interface FileExplorerProps {
  files: FileItem[];
  selectedFileId: string | null;
  onFileSelect: (file: FileItem) => void;
  onFileCreate: (file: FileItem) => void;
  onFileDelete: (fileId: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const newFile: FileItem = {
        id: generateId(),
        name: newFileName.trim(),
        content: '',
        language: getLanguageFromFileName(newFileName.trim()),
        isDirectory: false
      };
      onFileCreate(newFile);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFile();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFileName('');
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-gray-100 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-300">EXPLORER</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="New File"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {isCreating && (
          <div className="mb-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleCreateFile}
              placeholder="filename.ext"
              className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {files.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">
              No files yet
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-700 transition-colors ${
                  selectedFileId === file.id ? 'bg-gray-700 text-blue-400' : ''
                }`}
                onClick={() => onFileSelect(file)}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xs">{getFileIcon(file.name, file.isDirectory)}</span>
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-600 transition-all"
                  title="Delete file"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};