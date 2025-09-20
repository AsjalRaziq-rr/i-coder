import { useCallback } from 'react';
import { FileItem } from '../types';
import { generateId, getLanguageFromFileName } from '../utils/fileSystem';

export interface FileOperationsHook {
  executeFileOperation: (operation: any, files: FileItem[]) => Promise<FileItem[]>;
  executeCommand: (command: string) => Promise<string>;
}

export const useFileOperations = (): FileOperationsHook => {
  const executeFileOperation = useCallback(async (operation: any, files: FileItem[]): Promise<FileItem[]> => {
    const { type, path, content } = operation;
    
    switch (type) {
      case 'read':
        // Reading is handled by returning current files
        return files;
        
      case 'write':
        return files.map(file => 
          file.name === path 
            ? { ...file, content: content || '' }
            : file
        );
        
      case 'create':
        const existingFile = files.find(f => f.name === path);
        if (existingFile) {
          // Update existing file
          return files.map(file => 
            file.name === path 
              ? { ...file, content: content || '' }
              : file
          );
        } else {
          // Create new file
          const newFile: FileItem = {
            id: generateId(),
            name: path,
            content: content || '',
            language: getLanguageFromFileName(path),
            isDirectory: false
          };
          return [...files, newFile];
        }
        
      case 'delete':
        return files.filter(file => file.name !== path);
        
      default:
        return files;
    }
  }, []);

  const executeCommand = useCallback(async (command: string): Promise<string> => {
    // In a real implementation, this would execute actual commands
    // For now, we'll simulate command execution
    console.log('Executing command:', command);
    
    // Simulate common commands
    if (command.includes('npm install')) {
      return `✅ Package installed successfully`;
    } else if (command.includes('npm run')) {
      return `✅ Script executed successfully`;
    } else if (command.includes('mkdir')) {
      return `✅ Directory created`;
    } else {
      return `✅ Command executed: ${command}`;
    }
  }, []);

  return {
    executeFileOperation,
    executeCommand
  };
};