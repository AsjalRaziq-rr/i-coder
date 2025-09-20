import React, { useEffect, useRef } from 'react';
import { FileItem } from '../types';
import { RefreshCw, ExternalLink } from 'lucide-react';

interface PreviewProps {
  files: FileItem[];
  onRefresh: () => void;
}

export const Preview: React.FC<PreviewProps> = ({ files, onRefresh }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatePreviewContent = () => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => f.name.endsWith('.js'));

    if (!htmlFile) {
      return `
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
                color: #666;
              }
              .message {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <div class="message">
              <h3>No HTML file found</h3>
              <p>Create an HTML file to see the preview</p>
            </div>
          </body>
        </html>
      `;
    }

    let htmlContent = htmlFile.content;

    // Inject CSS if available
    if (cssFile) {
      const cssTag = `<style>${cssFile.content}</style>`;
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `${cssTag}\n</head>`);
      } else {
        htmlContent = `<head>${cssTag}</head>${htmlContent}`;
      }
    }

    // Inject JavaScript if available
    if (jsFile) {
      const jsTag = `<script>${jsFile.content}</script>`;
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${jsTag}\n</body>`);
      } else {
        htmlContent = `${htmlContent}${jsTag}`;
      }
    }

    return htmlContent;
  };

  useEffect(() => {
    if (iframeRef.current) {
      const content = generatePreviewContent();
      const iframe = iframeRef.current;
      iframe.srcdoc = content;
    }
  }, [files]);

  const handleOpenInNewTab = () => {
    const content = generatePreviewContent();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
        <div className="flex space-x-2">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw size={16} className="text-gray-600" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex-1">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Preview"
        />
      </div>
    </div>
  );
};