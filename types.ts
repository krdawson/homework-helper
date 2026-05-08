
export interface MathProblem {
  id: string;
  problemText: string;
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  hint?: string;
  highlightedProblemText?: string;
  highlightedStudentAnswer?: string;
  isUnworked?: boolean;
}

export type Subject = 'Math' | 'Spelling' | 'Vocabulary' | 'Grammar' | 'Science' | 'History' | 'Other';

export interface HomeworkAnalysis {
  problems: MathProblem[];
  subject: Subject;
  summary: string;
  score: string;
  handwritingLegibilityFeedback?: string;
  isBlankPage?: boolean;
}

export interface SavedAnalysis extends HomeworkAnalysis {
  savedId: string;
  timestamp: number;
  hintMode?: boolean;
}

export interface UserProfile {
  name: string;
  gradeLevel: string;
  hintMode?: boolean;
}

export interface PracticeProblem {
  id: string;
  problemText: string;
  correctAnswer: string;
}

export interface PracticeSet {
  problems: PracticeProblem[];
  gradeLevel: string;
}

export enum AppState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  STAGING = 'STAGING',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  SETTINGS = 'SETTINGS',
  PRACTICE_GENERATING = 'PRACTICE_GENERATING',
  PRACTICE_READY = 'PRACTICE_READY',
}
