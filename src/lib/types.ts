export type MBTIType = string;

export type AIInvolvement = 'active' | 'passive' | 'none';
export type ActivityCategory = '정보학습' | '문서사무' | '전문기술' | '창의기획' | '일상';

export type ReplacementLevel = 'critical' | 'high' | 'medium' | 'low' | 'assist' | 'human';

export interface RoutineEntry {
  time: string;
  activity: string;
  duration: number;
}

export interface AnalyzedActivity {
  activity: string;
  time: string;
  original_duration_hr: number;
  ai_involvement: AIInvolvement;
  category: ActivityCategory;
  is_high_cognitive: boolean;
  compression_ratio: number;
  saved_time_hr: number;
  agency_adjusted_hr: number;
  replacement_score: number;
  replacement_level: ReplacementLevel;
}

export interface TimeReport {
  totalHr: number;
  gainHr: number;
  erosionHr: number;
  augmentHr: number;
  mixedHr: number;
  humanHr: number;
}

export interface AnalysisResult {
  shiftIndex: number;
  persona: string;
  personaEmoji: string;
  personaDescription: string;
  personaTitle: string;
  activities: AnalyzedActivity[];
  timeReport: TimeReport;
  humanTimePercent: number;
  economicValueDaily: number;
  economicValueMonthly: number;
  economicValueYearly: number;
  percentileRank: number;
  wellnessAdvice: string;
  needsDetox: boolean;
  compatibleMBTI: string;
  compatiblePersona: string;
  oneLinerSummary: string;
}

export interface UserInput {
  mbti: string;
  routines: RoutineEntry[];
}
