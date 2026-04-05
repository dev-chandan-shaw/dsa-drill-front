export interface IQuestion {
  id: number;
  title: string;
  description?: string;
  link: string;
  difficulty: 'EASY' | 'MED' | 'HARD';
  isApproved: boolean;
  isArchived: boolean;
  patternName: string;
  patternId?: number;
  categoryId: number;
  slug?: string;
  sheetId?: number;
  template: {
    cppStarter: string;
    javaStarter: string;
    pythonStarter: string;
    jsStarter: string;
  };
  testCases: IQuestionTestCase[];
  examples?: IQuestionExample[];
}

export interface IQuestionTestCase {
  id: number;
  description: string;
  stdin: string;
  expectedOutput: string;
  sample: boolean;
  orderIndex: number;
}

export interface IQuestionExample {
  inputDescription: string;
  outputDescription: string;
  explanation: string;
  imageUrl: string | null;
}

export interface IAddQuestionDto {
  title: string;
  link: string;
  categoryId: number;
  difficulty: QuestionDifficulty;
  sheetId: number;
  questionPatternId?: number;
}

export enum QuestionDifficulty {
  Easy = 'EASY',
  Medium = 'MED',
  Hard = 'HARD',
}
