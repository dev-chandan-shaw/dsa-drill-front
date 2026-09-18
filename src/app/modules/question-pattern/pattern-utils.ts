import { IProblemPattern } from '../home/models/problem-pattern';
import { IProblem } from '../home/models/Question';

/** Patterns belonging to a tag, in stable name order. */
export function patternsForTag(patterns: IProblemPattern[], tagId: number): IProblemPattern[] {
  return patterns
    .filter((pattern) => (pattern.tagIds ?? []).includes(tagId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Canonical (primary) tag of a pattern — first id; backend sorts them. */
export function primaryTagId(pattern: IProblemPattern): number | null {
  return pattern.tagIds?.length ? pattern.tagIds[0] : null;
}

/**
 * Explicit practice set of a pattern: only the questions an admin linked to
 * it, in API order, deduped. Never derived from tags.
 */
export function linkedQuestions(problems: IProblem[], problemIds: number[]): IProblem[] {
  if (!problemIds.length) {
    return [];
  }
  const wanted = new Set(problemIds);
  const seen = new Set<number>();
  return problems.filter((problem) => {
    if (seen.has(problem.id) || !wanted.has(problem.id)) {
      return false;
    }
    seen.add(problem.id);
    return true;
  });
}
