export interface IProblemSheetSummary {
  id: string;
  title: string;
}

export interface IProblemSheetDetails {
  id: string;
  title: string;
  problemIds: number[];
  isPublic: boolean;
  isOwner?: boolean;
}
