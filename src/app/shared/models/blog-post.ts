export interface IBlogPostSummary {
  id: number;
  sectionId: number;
  sectionName: string;
  sectionSlug: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  readMinutes: number;
}

export interface IBlogPost extends IBlogPostSummary {
  content: string;
}

export interface IBlogPostDto {
  id?: number;
  sectionId: number;
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
}
