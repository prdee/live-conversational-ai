
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { AvatarState, DisplayContent } from './types.ts';
import Avatar from './components/Avatar.tsx';
import Controls from './components/Controls.tsx';
import NeuralBoard from './components/NeuralBoard.tsx';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const displayTool: FunctionDeclaration = {
  name: 'display_content',
  description: 'CRITICAL: Use this tool for ALL code, technical data, or visual explanations on the Neural Board. DO NOT use Markdown code blocks. The board is a holographic sandbox for HTML/CSS/JS. Ensure visuals are clean and responsive.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Descriptive title for the frame.' },
      html: { type: Type.STRING, description: 'Full self-contained HTML/CSS/JS source code.' }
    },
    required: ['html']
  }
};

const hideTool: FunctionDeclaration = {
  name: 'hide_content',
  description: 'Closes the holographic board.'
};

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [avatarState, setAvatarState] = useState<AvatarState>(AvatarState.IDLE);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [displayContent, setDisplayContent] = useState<DisplayContent | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<{ speaker: 'user' | 'ai'; text: string } | null>(null);
  
  const isMutedRef = useRef(isMuted);
  const sessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const endCall = useCallback(() => {
    if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setAvatarState(AvatarState.IDLE);
    setDisplayContent(null);
    analyzerRef.current = null;
    setIsStarted(false);
    setCurrentSubtitle(null);
    retryCountRef.current = 0;
  }, []);

  const initializeSession = useCallback(async (isRetry = false) => {
    if (!isRetry) retryCountRef.current = 0;
    
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) await aistudio.openSelectKey();
    }

    setIsConnecting(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const gainNode = outputCtx.createGain();
      gainNode.gain.value = volume;
      
      const analyzer = outputCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are JARVIS. 
          NEURAL BOARD PROTOCOLS:
          1. NEVER output code blocks (\`\`\`) in your text response.
          2. ALWAYS use 'display_content' for technical visuals.
          3. The user will see your core on the left and data on the right.
          4. When "listening", pulse cyan. Be efficient and predictive.`,
          tools: [{ functionDeclarations: [displayTool, hideTool] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            setErrorMsg(null);
            setAvatarState(AvatarState.LISTENING);
            retryCountRef.current = 0;
            
            const source = inputCtx.createMediaStreamSource(micStreamRef.current!);
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              sessionPromise.then((session) => {
                try {
                   session.sendRealtimeInput({ 
                    media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                  });
                } catch(e) {}
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'display_content') {
                  setDisplayContent({ type: 'html', data: fc.args.html as string, title: fc.args.title as string });
                  sessionPromise.then((session) => {
                    session.sendToolResponse({ 
                      functionResponses: { id: fc.id, name: fc.name, response: { result: 'Engaged.' } } 
                    });
                  });
                } else if (fc.name === 'hide_content') {
                  setDisplayContent(null);
                  sessionPromise.then((session) => {
                    session.sendToolResponse({ 
                      functionResponses: { id: fc.id, name: fc.name, response: { result: 'Disengaged.' } } 
                    });
                  });
                }
              }
            }

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentSubtitle({ speaker: 'user', text });
              setAvatarState(AvatarState.THINKING);
              setIsThinking(true);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentSubtitle(prev => {
                if (prev?.speaker === 'ai') return { speaker: 'ai', text: prev.text + ' ' + text };
                return { speaker: 'ai', text };
              });
            }
            if (message.serverContent?.turnComplete) {
              setIsThinking(false);
              setTimeout(() => setCurrentSubtitle(null), 3000);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setAvatarState(AvatarState.SPEAKING);
              setIsThinking(false);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);
              gainNode.connect(analyzer);
              analyzer.connect(outputCtx.destination);
              
              source.addEventListener('ended', () => { 
                if (sourcesRef.current.size <= 1) setAvatarState(AvatarState.LISTENING);
                sourcesRef.current.delete(source); 
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              setAvatarState(AvatarState.LISTENING);
              setIsThinking(false);
              setCurrentSubtitle(null);
            }
          },
          onerror: () => {
            setIsConnected(false);
            setIsConnecting(false);
            handleAutoRetry("Link disturbance.");
          },
          onclose: () => {
            setIsConnected(false);
            setIsConnecting(false);
            setAvatarState(AvatarState.IDLE);
            if (isStarted) handleAutoRetry("Rebooting link...");
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setIsConnecting(false);
      handleAutoRetry("Bridge failure.");
    }
  }, [volume, isStarted]);

  const handleAutoRetry = useCallback((msg?: string) => {
    if (retryCountRef.current < 5) {
      retryCountRef.current++;
      const delay = Math.min(Math.pow(2, retryCountRef.current) * 1500, 15000);
      setErrorMsg(`${msg || 'Reconnecting...'} [${retryCountRef.current}/5]`);
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = window.setTimeout(() => initializeSession(true), delay);
    } else {
      setErrorMsg("Critical failure.");
      setIsStarted(false);
    }
  }, [initializeSession]);

  useEffect(() => {
    let animId: number;
    const dataArray = new Uint8Array(128);
    const update = () => {
      if (analyzerRef.current && avatarState === AvatarState.SPEAKING) {
        analyzerRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioLevel(sum / (dataArray.length * 255));
      } else {
        setAudioLevel(0);
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [avatarState]);

  return (
    <div className="relative w-screen h-screen bg-[#080808] text-white flex flex-col overflow-hidden font-['Inter']">
      {/* Network Alert */}
      {errorMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-2xl">
          {errorMsg}
        </div>
      )}

      {isStarted ? (
        <main className="flex-1 flex flex-col md:flex-row relative w-full h-full overflow-hidden">
          
          {/* Panel 1: Proton Core + Subtitles (30% on Desktop) */}
          <section className={`relative h-full transition-all duration-700 ease-in-out flex flex-col items-center justify-center 
            ${displayContent ? 'md:w-[30%] w-full' : 'w-full'}`}>
            
            <div className="w-full h-full">
              <Avatar state={avatarState} audioLevel={audioLevel} displayContent={displayContent} />
            </div>

            {/* Subtitles: Tethered below core */}
            {currentSubtitle && (
              <div className="absolute bottom-[20%] w-full px-6 z-50 flex justify-center pointer-events-none">
                <div className="max-w-[90%] bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2">
                  <p className={`text-base md:text-lg font-medium text-center leading-snug drop-shadow-md ${currentSubtitle.speaker === 'user' ? 'text-cyan-400' : 'text-white'}`}>
                    {currentSubtitle.text}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Panel 2: Neural Board (70% on Desktop) */}
          <section className={`transition-all duration-700 ease-in-out overflow-hidden 
            ${displayContent ? 'md:w-[70%] w-full h-full relative' : 'w-0 h-0 overflow-hidden'}`}>
            <NeuralBoard content={displayContent} onClose={() => setDisplayContent(null)} />
          </section>

          <Controls
            isMuted={isMuted} onToggleMute={() => setIsMuted(prev => !prev)}
            onEndCall={endCall} isConnected={isConnected} isThinking={isConnecting || isThinking} volume={volume} onVolumeChange={setVolume}
            avatarState={avatarState}
          />
        </main>
      ) : (
        <div className="w-screen h-screen bg-[#050505] flex items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,242,255,0.04)_0%,_transparent_70%)]" />
          <div className="z-10 text-center">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-10">JARVIS<span className="text-cyan-500">.</span></h1>
            <button 
              onClick={() => { retryCountRef.current = 0; setIsStarted(true); initializeSession(); }} 
              className="px-14 py-5 bg-white text-black rounded-full font-black uppercase tracking-widest text-sm transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              Initiate Neural Link
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ping-horizontal {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-ping-horizontal {
          animation: ping-horizontal 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
