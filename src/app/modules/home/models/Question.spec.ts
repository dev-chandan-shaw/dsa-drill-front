import {
  compareProblemsByOrder,
  IProblem,
  ProblemDifficulty,
  problemDisplayNumber,
  sortProblemsByOrder,
} from './Question';

function problem(id: number, order?: number | null): IProblem {
  return {
    id,
    title: `Problem ${id}`,
    link: `https://example.com/${id}`,
    difficulty: ProblemDifficulty.Easy,
    tags: [],
    order,
  };
}

describe('compareProblemsByOrder', () => {
  it('sorts by curated order first', () => {
    expect(compareProblemsByOrder(problem(1, 3), problem(2, 1))).toBeGreaterThan(0);
    expect(compareProblemsByOrder(problem(1, 1), problem(2, 3))).toBeLessThan(0);
  });

  it('sorts unset orders last with id tiebreak', () => {
    expect(compareProblemsByOrder(problem(1), problem(2, 1))).toBeGreaterThan(0);
    expect(compareProblemsByOrder(problem(5), problem(3))).toBeGreaterThan(0);
    expect(compareProblemsByOrder(problem(1, 2), problem(2, 2))).toBeLessThan(0);
  });

  it('sortProblemsByOrder returns a sorted copy without mutating', () => {
    const list = [problem(1, 3), problem(2), problem(3, 1)];
    const sorted = sortProblemsByOrder(list);
    expect(sorted.map((p) => p.id)).toEqual([3, 1, 2]);
    expect(list.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe('problemDisplayNumber', () => {
  it('prefers order and falls back to id', () => {
    expect(problemDisplayNumber(problem(7, 2))).toBe(2);
    expect(problemDisplayNumber(problem(7))).toBe(7);
    expect(problemDisplayNumber(problem(7, null))).toBe(7);
  });
});
