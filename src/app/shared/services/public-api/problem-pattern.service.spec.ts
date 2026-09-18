import { normalizePattern } from './problem-pattern.service';

describe('normalizePattern', () => {
  it('keeps multi-tag payloads', () => {
    expect(
      normalizePattern({ id: 1, name: 'SW', explanation: 'x', tagIds: [2, 1] }),
    ).toEqual({ id: 1, name: 'SW', explanation: 'x', tagIds: [2, 1], problemIds: [] });
  });

  it('upgrades legacy single-tag payloads', () => {
    expect(normalizePattern({ id: 1, name: 'SW', explanation: 'x', tagId: 4 })).toEqual({
      id: 1,
      name: 'SW',
      explanation: 'x',
      tagIds: [4],
      problemIds: [],
    });
  });

  it('dedupes and drops non-numeric ids', () => {
    expect(
      normalizePattern({ id: 1, name: 'SW', explanation: 'x', tagIds: [2, 2, 'a' as never] }),
    ).toEqual({ id: 1, name: 'SW', explanation: 'x', tagIds: [2], problemIds: [] });
  });

  it('defaults to empty tags when absent', () => {
    expect(normalizePattern({ id: 1, name: 'SW', explanation: 'x' })).toEqual({
      id: 1,
      name: 'SW',
      explanation: 'x',
      tagIds: [],
      problemIds: [],
    });
  });

  it('keeps linked problem ids and cleans them', () => {
    expect(
      normalizePattern({
        id: 1,
        name: 'SW',
        explanation: 'x',
        tagIds: [2],
        problemIds: [11, 11, 'z' as never],
      }),
    ).toEqual({ id: 1, name: 'SW', explanation: 'x', tagIds: [2], problemIds: [11] });
  });
});
