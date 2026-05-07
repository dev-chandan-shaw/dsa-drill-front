export interface IProblemSheetSummary {
  id: number;
  title: string;
}

export interface IProblemSheetDetails {
  id: number;
  title: string;
  problemIds: number[];
  isPublic: boolean;
}
