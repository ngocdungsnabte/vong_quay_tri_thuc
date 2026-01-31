
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SCENARIO = 'scenario',
  FILL_BLANK = 'fill_blank',
  TRUE_FALSE = 'true_false'
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  answer: string;
  hint: string;
  explanation: string;
}

export interface Student {
  id: string;
  name: string;
  isParticipated: boolean;
}

export interface GameSettings {
  showHints: boolean;
  showCorrectAnswers: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  maxQuestions: number;
}
