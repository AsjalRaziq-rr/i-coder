import { FileItem } from '../types';

export const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'yml': 'yaml',
    'yaml': 'yaml'
  };

  return languageMap[extension || ''] || 'plaintext';
};

export const getFileIcon = (fileName: string, isDirectory: boolean): string => {
  if (isDirectory) return '📁';
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const iconMap: { [key: string]: string } = {
    'js': '🟨',
    'jsx': '⚛️',
    'ts': '🔷',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'md': '📝',
    'txt': '📄'
  };

  return iconMap[extension || ''] || '📄';
};

export const createInitialFiles = (): FileItem[] => [];

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};