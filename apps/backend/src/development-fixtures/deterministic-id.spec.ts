import { deterministicId } from './deterministic-id';

describe('deterministic fixture ids', () => {
  it('derives the same UUID for the same key', () => {
    expect(deterministicId('client:lucia')).toBe(
      deterministicId('client:lucia'),
    );
  });

  it('derives different UUIDs for different keys', () => {
    expect(deterministicId('client:lucia')).not.toBe(
      deterministicId('client:valeria'),
    );
  });

  it('formats the id as a UUID', () => {
    expect(deterministicId('branch:centro')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
