export interface IUserQuestionStatus {
  problemId: number;
  revision?: boolean;
  solved?: boolean;
  note?: string;
}

export interface UserQuestionStatusDto {
  problemId: number;
  revision?: boolean;
  solved?: boolean;
  note?: string;
}
