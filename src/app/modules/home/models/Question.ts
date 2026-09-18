export interface IProblem {
  id: number;
  title: string;
  link: string;
  difficulty: ProblemDifficulty;
  isApproved?: boolean;
  isArchived?: boolean;
  slug?: string;
  tags: number[];
  /** Global display order; null sorts last. Shown as the list prefix. */
  order?: number | null;
}

export enum ProblemDifficulty {
  Easy = 'EASY',
  Medium = 'MED',
  Hard = 'HARD',
}

/**
 * Global question ordering, mirroring the backend
 * `ORDER BY display_order NULLS LAST, id`. Always sorts a copy — never
 * mutate signal arrays in place. Runs identically on server and client.
 */
export function compareProblemsByOrder(a: IProblem, b: IProblem): number {
  const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.id - b.id;
}

export function sortProblemsByOrder(problems: IProblem[]): IProblem[] {
  return [...problems].sort(compareProblemsByOrder);
}

/** List prefix: curated order, falling back to the id. */
export function problemDisplayNumber(problem: IProblem): number {
  return problem.order ?? problem.id;
}
