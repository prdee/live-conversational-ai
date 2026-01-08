
export enum AvatarState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING'
}

export interface DisplayContent {
  type: 'diagram' | 'text' | 'image' | 'code' | 'svg' | 'html';
  data: string;
  title?: string;
}

export interface TranscriptionEntry {
  text: string;
  timestamp: number;
  speaker: 'user' | 'ai';
}
