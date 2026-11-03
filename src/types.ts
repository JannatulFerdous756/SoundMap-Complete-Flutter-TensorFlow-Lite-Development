export interface YamnetPrediction {
  label: string;
  category: 'traffic' | 'nature' | 'construction' | 'speech' | 'siren' | 'music' | 'hvac' | 'animal' | 'ambient';
  confidence: number;
  description: string;
}

export interface AudioMetrics {
  dbfs: number; // Digital relative decibels (-60 to 0)
  dbSpl: number; // Estimated Sound Pressure Level in dBA (~35 to 105 dBA)
  peakDbfs: number;
  leq: number; // Equivalent continuous sound level
  rms: number;
  spectralCentroid: number; // Hz
  spectralRolloff: number; // Hz
  zeroCrossingRate: number;
  dominantBand: string;
}

export interface SoundObservation {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  dbfs: number;
  dbSpl: number;
  primarySound: string;
  confidence: number;
  category: 'traffic' | 'nature' | 'construction' | 'speech' | 'siren' | 'ambient';
  timestamp: string;
  reportedBy: string;
}

export interface CommunityReport {
  id: string;
  title: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  decibel: number;
  locationName: string;
  latitude: number;
  longitude: number;
  description: string;
  createdAt: string;
  upvotes: number;
  status: 'active' | 'investigating' | 'resolved';
}

export interface AcousticAnalysisResult {
  acousticSummary: string;
  whoGuidelineEvaluation: string;
  ordinanceStatus: string;
  healthImpact: string;
  recommendations: string[];
}

export interface ScanSession {
  id: string;
  timestamp: string;
  durationSeconds: number;
  durationFormatted: string;
  peakDbfs: number;
  peakDbSpl: number;
  avgDbfs: number;
  avgDbSpl: number;
  primarySound: string;
  confidence: number;
  category: 'traffic' | 'nature' | 'construction' | 'speech' | 'siren' | 'music' | 'hvac' | 'animal' | 'ambient';
  topSounds: { label: string; confidence: number }[];
  source: 'mic' | 'sim';
  simPreset?: string;
  notes?: string;
}
