export interface IBlogSection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  displayOrder: number;
  postCount: number;
  publishedPostCount: number;
}

export interface IBlogSectionDto {
  id?: number;
  name: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  displayOrder?: number;
}
