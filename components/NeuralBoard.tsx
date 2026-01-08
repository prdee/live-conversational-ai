
import React, { useEffect, useState, useRef } from 'react';
import { DisplayContent } from '../types.ts';

interface NeuralBoardProps {
  content: DisplayContent | null;
  onClose: () => void;
}

const NeuralBoard: React.FC<NeuralBoardProps> = ({ content, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (content) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [content]);

  if (!content && !isVisible) return null;

  return (
    <div 
      className={`w-full h-full flex flex-col p-4 md:p-8 transition-all duration-1000 transform-gpu
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      style={{ perspective: '1500px' }}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between px-6 py-4 bg-cyan-500/5 backdrop-blur-3xl border border-cyan-500/20 rounded-t-3xl border-b-0">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
            {content?.title || 'NEURAL STREAM ANALYTICS'}
          </span>
        </div>
        <button onClick={onClose} className="text-cyan-400/40 hover:text-cyan-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Workspace */}
      <div className="flex-1 relative bg-black/60 backdrop-blur-md border border-cyan-500/10 rounded-b-3xl overflow-hidden shadow-[0_0_80px_rgba(0,242,255,0.05)]">
        <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-400 animate-scan" />
        </div>

        <iframe
          ref={iframeRef}
          title="Neural Sandbox"
          className="w-full h-full border-none bg-transparent"
          sandbox="allow-scripts allow-modals"
          srcDoc={`
            <!DOCTYPE html>
            <html style="height: 100%; width: 100%;">
              <head>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
                <style>
                  * { box-sizing: border-box; }
                  body { 
                    margin: 0; padding: 32px;
                    background: transparent; color: #f8fafc; 
                    font-family: 'Inter', sans-serif; 
                    height: 100%; width: 100%;
                    overflow-x: hidden; overflow-y: auto;
                  }
                  ::-webkit-scrollbar { width: 4px; }
                  ::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.3); border-radius: 10px; }
                  .glass { 
                    background: rgba(15, 23, 42, 0.8); 
                    border: 1px solid rgba(34, 211, 238, 0.2); 
                    border-radius: 20px; padding: 24px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                  }
                </style>
              </head>
              <body>
                ${content?.data || ''}
              </body>
            </html>
          `}
        />
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan { animation: scan 6s linear infinite; }
      `}</style>
    </div>
  );
};

export default NeuralBoard;
