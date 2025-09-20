export interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirectory: boolean;
  parentId?: string;
}

export interface Tab {
  id: string;
  name: string;
  isDirty: boolean;
}

export interface EditorState {
  files: FileItem[];
  openTabs: Tab[];
  activeTabId: string | null;
  selectedFileId: string | null;
  showPreview: boolean;
  showChat: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}