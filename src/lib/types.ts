export type MBTIType = string;

export type AIInvolvement = 'active' | 'passive' | 'none';
export type ActivityCategory = '정보학습' | '문서사무' | '전문기술' | '창의기획' | '일상';

export type ReplacementLevel = 'critical' | 'high' | 'medium' | 'low' | 'safe';

export interface RoutineEntry {
  time: string;
  activity: string;
  duration: number; // in hours
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
  replacement_score: number; // 0-100
  replacement_level: ReplacementLevel;
}

export interface TimeReport {
  totalHr: number;        // 총 입력 시간
  gainHr: number;         // 획득 시간 (Blue)
  erosionHr: number;      // 잠식 시간 (Red)
  augmentHr: number;      // 증강 시간 (Green)
  mixedHr: number;        // 혼재 시간 (Yellow)
  humanHr: number;        // 고유 시간 (Purple)
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
