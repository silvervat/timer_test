export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export enum WorkStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  PAUSED = 'PAUSED',
}

export interface PauseEntry {
  startTime: number;
  startLocation: LocationData;
  startPhoto: string;
  startDistance: number;
  endTime?: number;
  endLocation?: LocationData;
  endPhoto?: string;
  endDistance?: number;
}

export interface WorkSession {
  id: string;
  startTime: number;
  startLocation: LocationData;
  startPhoto: string; // Base64
  startDistance?: number; // Distance from site center in meters
  startAnalysis?: string; // Verification text
  
  pauses: PauseEntry[]; // Array of pauses

  endTime?: number;
  endLocation?: LocationData;
  endPhoto?: string; // Base64
  endDistance?: number;
  endAnalysis?: string;
  totalTimeMs?: number; // Net working time (excluding pauses)
}

export type ActionType = 'START' | 'STOP' | 'PAUSE' | 'RESUME';

export interface CameraError {
  type: 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'UNKNOWN';
  message: string;
}