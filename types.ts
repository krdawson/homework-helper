
export interface MathProblem {
  id: string;
  problemText: string;
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  highlightedProblemText?: string;
  highlightedStudentAnswer?: string;
  isUnworked?: boolean;
}

export interface HomeworkAnalysis {
  problems: MathProblem[];
  summary: string;
  score: string;
  handwritingLegibilityFeedback?: string;
  isBlankPage?: boolean;
}

export interface SavedAnalysis extends HomeworkAnalysis {
  savedId: string;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  gradeLevel: string;
}

export enum AppState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  SETTINGS = 'SETTINGS'
}
