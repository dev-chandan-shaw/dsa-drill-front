export interface IProblem {
  id: number;
  title: string;
  link: string;
  difficulty: ProblemDifficulty;
  isApproved?: boolean;
  isArchived?: boolean;
  slug?: string;
  tags: number[];
}

export enum ProblemDifficulty {
  Easy = 'EASY',
  Medium = 'MED',
  Hard = 'HARD',
}
