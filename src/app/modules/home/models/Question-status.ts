import { IQuestion } from './Question';

export interface IUserQuestionStatus {
  id: number;
  question: IQuestion;
  isMarkedForRevision: boolean;
  isSolved: boolean;
  note: string | null;
}

export interface UserQuestionStatusDto {
  questionId: number;
  isMarkedForRevision?: boolean;
  isSolved?: boolean;
  note?: string;
}
