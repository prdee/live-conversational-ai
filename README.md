<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Live Conversational AI (JARVIS)

Real-time conversational AI powered by Gemini 2.5 with low-latency streaming audio in/out, on-screen subtitles, and a “Neural Board” for rich technical visuals rendered from tool calls. Built with React 19, Vite 6, and TypeScript.

## Features
- Live mic capture at 16 kHz, streamed to Gemini for transcription and response
- Real-time AI audio playback at 24 kHz with smooth scheduling
- Subtitles for user input and AI output
- Neural Board tool to display interactive HTML/CSS/JS content from the model
- Resilient session handling with exponential backoff auto-retry

## Tech Stack
- React 19, TypeScript, Vite 6
- @google/genai (Gemini)
- three (visuals support via components)

## Prerequisites
- Node.js 18+ recommended
- A Gemini API key
- Microphone permission in the browser

## Quick Start
1. Install dependencies:
   - `npm install`
2. Create `.env.local` and set your Gemini key:
   - `GEMINI_API_KEY=your_key_here`
3. Start the dev server:
   - `npm run dev`
4. Open http://localhost:3000 and click “Initiate Neural Link”. Allow microphone access.

The build config maps `GEMINI_API_KEY` into `process.env.API_KEY` for the runtime, so the app code can read it safely. See vite configuration for definitions.

## Environment Variables
- GEMINI_API_KEY: your Gemini API key

Vite exposes this value to the client bundle via `process.env.API_KEY` and `process.env.GEMINI_API_KEY`. See [vite.config.ts](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/vite.config.ts#L5-L16).

## Scripts
- `npm run dev` — start local dev server
- `npm run build` — create a production build in `dist/`
- `npm run preview` — preview the production build locally

## Usage
- Initiate: press “Initiate Neural Link” to start the session
- Mute/Volume: control mic sending and output volume in the floating controls
- Subtitles: user speech shows in cyan; AI speech shows in white and collapses after the turn completes
- Neural Board: the model can call `display_content` to render interactive visuals; `hide_content` closes it

## Architecture Overview
- App entry: [App.tsx](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/App.tsx)
  - Establishes a live session with Gemini, manages mic input stream and output audio
  - Handles tool calls for the Neural Board and UI states for listening/thinking/speaking
- Audio encode/decode:
  - `encode`/`decode` base64 helpers for PCM payloads [App.tsx:9-22](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/App.tsx#L9-L22)
  - `decodeAudioData` converts Int16 PCM to an AudioBuffer [App.tsx:24-35](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/App.tsx#L24-L35)
- Live session events:
  - Input capture and streaming at 16 kHz [App.tsx:149-168](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/App.tsx#L149-L168)
  - Server messages drive subtitles and output audio scheduling [App.tsx:169-228](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/App.tsx#L169-L228)
  - Interruption handling and retries [App.tsx:230-269](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/App.tsx#L230-L269)
- UI components:
  - Avatar core and audio level visualization [components/Avatar.tsx](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/components/Avatar.tsx)
  - Controls (mute, end call, volume, state) [components/Controls.tsx](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/components/Controls.tsx)
  - Neural Board surface [components/NeuralBoard.tsx](file:///Users/pradeep/Desktop/personal/code/live-conversation-ai/components/NeuralBoard.tsx)

## Deployment
This is a static Vite app:
- Build: `npm run build` → outputs `dist/`
- Any static host (Netlify, Vercel, GitHub Pages, Firebase Hosting, S3 + CloudFront) can serve `dist/`
- Local preview: `npm run preview`

If deploying behind a different base path, configure Vite’s `base` accordingly.

## Security Notes
- Never commit API keys. `.env*` entries are ignored by default via `.gitignore`
- Keys are injected at build time and not hard-coded in source

## Troubleshooting
- Mic not detected: ensure browser permissions and a working input device
- 401/403 errors: verify `GEMINI_API_KEY` and quota/permissions
- No audio output: check system sound settings and ensure `isMuted` is off
- Frequent disconnects: the app auto-retries with exponential backoff; verify network stability

## License
Proprietary or custom; update this section if you plan to publish under a specific license.
