export type LibraryViewType = 'QUESTION_LIST' | 'ARTICLE_COLLECTION' | 'SHEET_LIST';

export interface CatalogSection {
  code: string;
  title: string;
  viewType: LibraryViewType;
}

export interface CatalogSubject {
  code: string;
  title: string;
  description: string;
  icon: string;
  sections: CatalogSection[];
}

/**
 * The library catalog is intentionally defined in the frontend. The database
 * stores design articles by level and kind, and DSA patterns by question tag.
 */
export const LIBRARY_CATALOG: CatalogSubject[] = [
  {
    code: 'dsa',
    title: 'DSA',
    description:
      'Practice questions and understand the patterns behind them.',
    icon: 'code',
    sections: [
      { code: 'questions', title: 'Questions', viewType: 'QUESTION_LIST' },
      { code: 'patterns', title: 'Patterns', viewType: 'ARTICLE_COLLECTION' },
      { code: 'sheets', title: 'Sheets', viewType: 'SHEET_LIST' },
    ],
  },
  {
    code: 'lld',
    title: 'Low-Level Design',
    description:
      'Learn object-oriented design, design patterns, and practical case studies.',
    icon: 'widgets',
    sections: [
      { code: 'concepts', title: 'Concepts', viewType: 'ARTICLE_COLLECTION' },
      { code: 'case-studies', title: 'Case Studies', viewType: 'ARTICLE_COLLECTION' },
    ],
  },
  {
    code: 'hld',
    title: 'High-Level Design',
    description:
      'Explore system design fundamentals and complete design walkthroughs.',
    icon: 'schema',
    sections: [
      { code: 'concepts', title: 'Concepts', viewType: 'ARTICLE_COLLECTION' },
      { code: 'case-studies', title: 'Case Studies', viewType: 'ARTICLE_COLLECTION' },
    ],
  },
];

export const findSubject = (code: string | null | undefined) =>
  LIBRARY_CATALOG.find((subject) => subject.code === code) ?? null;

export const findSection = (subjectCode: string | null | undefined, sectionCode: string | null | undefined) => {
  const subject = findSubject(subjectCode);
  return subject?.sections.find((section) => section.code === sectionCode) ?? null;
};

export const articleSections = LIBRARY_CATALOG.flatMap((subject) =>
  subject.sections
    .filter((section) => section.viewType === 'ARTICLE_COLLECTION')
    .map((section) => ({
      ...section,
      subject: subject.code,
      label: `${subject.title} / ${section.title}`,
      writeLabel: subject.code === 'dsa' ? 'DSA pattern' :
        `${subject.code.toUpperCase()} ${section.code === 'concepts' ? 'concept' : 'case study'}`,
    })),
);

export const sectionPath = (subject: string, section: string) => `/library/${subject}/${section}`;
