export type MBTIType = string;

export type AIInvolvement = 'active' | 'passive' | 'none';
export type ActivityCategory = '정보학습' | '문서사무' | '전문기술' | '창의기획' | '일상';

export interface RoutineEntry {
  time: string;
  activity: string;
  duration: number; // minutes
}

export interface AnalyzedActivity {
  activity: string;
  time: string;
  original_duration_min: number;
  ai_involvement: AIInvolvement;
  category: ActivityCategory;
  is_high_cognitive: boolean;
  compression_ratio: number;
  saved_time_min: number;
  agency_adjusted_min: number;
  status: 'erosion' | 'gain' | 'human' | 'assist';
}

export interface AnalysisResult {
  shiftIndex: number;
  persona: string;
  personaDescription: string;
  activities: AnalyzedActivity[];
  totalOriginalMin: number;
  totalSavedMin: number;
  totalErosionMin: number;
  totalGainMin: number;
}

export interface UserInput {
  mbti: string;
  routines: RoutineEntry[];
}
