
import React from 'react';
import { AvatarState } from '../types.ts';

interface ControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  isConnected: boolean;
  isThinking: boolean;
  volume: number;
  onVolumeChange: (val: number) => void;
  avatarState?: AvatarState;
}

const Controls: React.FC<ControlsProps> = ({
  isMuted,
  onToggleMute,
  onEndCall,
  isConnected,
  isThinking,
  avatarState
}) => {
  const isListening = avatarState === AvatarState.LISTENING;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 md:h-32 flex items-center justify-between px-6 md:px-12 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
      <div className="flex items-center gap-4 md:gap-8 w-1/4 md:w-1/3">
        <div className="flex flex-col">
          <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] transition-colors duration-500 ${
            isConnected 
              ? (isListening ? 'text-cyan-400 animate-pulse' : 'text-cyan-600') 
              : 'text-red-500'
          }`}>
            {isListening ? 'Listening' : 'Sync'}
          </span>
          <div className="hidden md:flex gap-1.5 mt-2">
             {[1,2,3,4,5].map(i => (
               <div key={i} className={`w-1 h-1 rounded-full transition-all duration-500 ${
                 isConnected 
                  ? (isListening ? 'bg-cyan-400 scale-125' : 'bg-cyan-500/20') 
                  : 'bg-red-500/20'
               }`} />
             ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <button
          onClick={onToggleMute}
          className={`p-4 md:p-6 rounded-full transition-all duration-500 border-2 ${
            isMuted ? 'bg-red-500 border-red-500 text-white' : 'bg-transparent border-cyan-500/20 text-white hover:border-cyan-500/60'
          }`}
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isMuted ? "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} />
          </svg>
        </button>

        <button
          onClick={onEndCall}
          className="group p-6 md:p-8 rounded-full bg-white text-black hover:bg-red-600 hover:text-white transition-all duration-300 shadow-2xl"
        >
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex items-center justify-end w-1/4 md:w-1/3">
        <div className="hidden md:flex flex-col items-end">
           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400/30 mb-2">Neural Load</span>
           <div className="h-1 w-24 md:w-32 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full bg-cyan-500 transition-all duration-700 ${isThinking ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;
