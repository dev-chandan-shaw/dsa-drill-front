export interface IProblemPattern {
  id: number;
  name: string;
  explanation: string;
  tagIds: number[];
  /** Admin-curated practice questions (explicit links, not tag union). */
  problemIds: number[];
}
