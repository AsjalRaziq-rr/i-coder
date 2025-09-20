import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageSquare, Code, Terminal, FileText } from 'lucide-react';
import { ChatMessage } from '../types';
import { queryMistral, MistralResponse } from '../services/mistralService';
import { useFileOperations } from '../hooks/useFileOperations';
import { FileItem } from '../types';

interface ChatProps {
  files: FileItem[];
  onFilesUpdate: (files: FileItem[]) => void;
  onFileSelect: (file: FileItem) => void;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ files, onFilesUpdate, onFileSelect, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI coding assistant powered by Mistral. I can help you with code, read/write files, and execute commands. What would you like me to help you with?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { executeFileOperation, executeCommand } = useFileOperations();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const processAIResponse = async (response: MistralResponse): Promise<void> => {
    let updatedFiles = [...files];
    const operations: string[] = [];

    // Execute file operations
    if (response.fileOperations && response.fileOperations.length > 0) {
      for (const operation of response.fileOperations) {
        updatedFiles = await executeFileOperation(operation, updatedFiles);
        operations.push(`📁 ${operation.type}: ${operation.path}`);
      }
      onFilesUpdate(updatedFiles);
    }

    // Execute command operations
    if (response.commandOperations && response.commandOperations.length > 0) {
      for (const operation of response.commandOperations) {
        const result = await executeCommand(operation.command);
        operations.push(`⚡ ${operation.command}: ${result}`);
      }
    }

    // Add operations summary to message if any operations were performed
    let finalMessage = response.message;
    if (operations.length > 0) {
      finalMessage += '\n\n**Operations performed:**\n' + operations.join('\n');
    }

    // Add code blocks if present
    if (response.codeBlocks && response.codeBlocks.length > 0) {
      finalMessage += '\n\n**Code examples:**';
      response.codeBlocks.forEach((block, index) => {
        finalMessage += `\n\n\`\`\`${block.language}\n${block.code}\n\`\`\``;
        if (block.filename) {
          finalMessage += `\n*File: ${block.filename}*`;
        }
      });
    }

  return finalMessage;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Add context about current files to the prompt
      const fileContext = files.map(f => `${f.name} (${f.language})`).join(', ');
      const contextualPrompt = `Current files: ${fileContext}\n\nUser request: ${inputValue}`;
      
      const mistralResponse = await queryMistral(contextualPrompt);
      const processedMessage = await processAIResponse(mistralResponse);
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: processedMessage,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-blue-600" />
          <h3 className="text-sm font-medium text-gray-700">Mistral AI Assistant</h3>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Code size={12} />
            <Terminal size={12} />
            <FileText size={12} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Close Chat"
        >
          <X size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex space-x-2 max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isUser ? 'bg-blue-600' : 'bg-gray-600'
              }`}>
                {message.isUser ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-white" />
                )}
              </div>
              <div className={`rounded-lg p-3 ${
                message.isUser 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 opacity-70 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to help with code, read/write files, or execute commands..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};