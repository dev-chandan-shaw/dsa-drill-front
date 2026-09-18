import { linkedQuestions, patternsForTag, primaryTagId } from './pattern-utils';
import { topicCover } from './topic-covers';
import { markdownExcerpt } from './markdown-excerpt';
import { IProblemPattern } from '../home/models/problem-pattern';
import { IProblem, ProblemDifficulty } from '../home/models/Question';

const patterns: IProblemPattern[] = [
  { id: 1, name: 'Beta', explanation: 'b', tagIds: [1, 2], problemIds: [1] },
  { id: 2, name: 'Alpha', explanation: 'a', tagIds: [2], problemIds: [] },
  { id: 3, name: 'Gamma', explanation: 'g', tagIds: [], problemIds: [] },
];

const problems: IProblem[] = [
  { id: 1, title: 'One', link: 'https://x/1', difficulty: ProblemDifficulty.Easy, tags: [1] },
  { id: 2, title: 'Two', link: 'https://x/2', difficulty: ProblemDifficulty.Medium, tags: [1, 2] },
  { id: 3, title: 'Three', link: 'https://x/3', difficulty: ProblemDifficulty.Hard, tags: [3] },
];

describe('pattern-utils', () => {
  it('filters patterns by tag in name order', () => {
    expect(patternsForTag(patterns, 2).map((p) => p.name)).toEqual(['Alpha', 'Beta']);
    expect(patternsForTag(patterns, 9)).toEqual([]);
  });

  it('picks the first tag as canonical', () => {
    expect(primaryTagId(patterns[0])).toBe(1);
    expect(primaryTagId(patterns[2])).toBeNull();
  });

  it('unions linked questions without duplicates', () => {
    expect(linkedQuestions(problems, [2, 1]).map((p) => p.id)).toEqual([1, 2]);
    expect(linkedQuestions(problems, [])).toEqual([]);
expect(linkedQuestions(problems, [99])).toEqual([]);
  });
});

describe('topicCover', () => {
  it('returns curated covers case-insensitively', () => {
    expect(topicCover('Arrays')).toEqual(topicCover('arrays'));
    expect(topicCover('arrays').glyph).toBe('[]');
  });

  it('falls back deterministically for unknown slugs', () => {
    expect(topicCover('brand-new-topic')).toEqual(topicCover('brand-new-topic'));
    expect(topicCover('brand-new-topic').glyph).toBeTruthy();
  });
});

describe('markdownExcerpt', () => {
  it('strips formatting and truncates at word boundaries', () => {
    expect(markdownExcerpt('**Bold** and `code` with [link](https://x.com/y)')).toBe(
      'Bold and code with link',
    );
    const long = markdownExcerpt(`${'word '.repeat(50)}`, 20);
    expect(long.length).toBeLessThanOrEqual(21);
    expect(long.endsWith('…')).toBe(true);
  });

  it('drops fenced blocks, headings and quotes', () => {
    expect(markdownExcerpt('## Title\n\n```python\nx = 1\n```\n\n> note here')).toBe(
      'Title note here',
    );
  });

  it('handles empty input', () => {
    expect(markdownExcerpt('')).toBe('');
    expect(markdownExcerpt(null)).toBe('');
  });
});
