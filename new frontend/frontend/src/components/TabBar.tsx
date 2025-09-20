import React from 'react';
import { X } from 'lucide-react';
import { Tab } from '../types';
import { getFileIcon } from '../utils/fileSystem';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group flex items-center space-x-2 px-4 py-2 border-r border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors min-w-0 ${
            activeTabId === tab.id 
              ? 'bg-gray-900 text-white border-b-2 border-blue-500' 
              : 'text-gray-300'
          }`}
          onClick={() => onTabSelect(tab.id)}
        >
          <span className="text-xs">{getFileIcon(tab.name, false)}</span>
          <span className="text-sm truncate">
            {tab.name}
            {tab.isDirty && <span className="text-orange-400 ml-1">•</span>}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-600 transition-all flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};