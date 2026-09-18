export interface IProblemTag {
  id: number;
  name: string;
  problemCount?: number;
  slug: string;
  coverFrom?: string | null;
  coverTo?: string | null;
  coverGlyph?: string | null;
}
