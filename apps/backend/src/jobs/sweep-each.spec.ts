import { SweepItemsFailed, sweepEach } from './sweep-each';

describe('sweepEach', () => {
  it('runs every item and resolves when none fails', async () => {
    const seen: string[] = [];

    await sweepEach(
      'class_reminders',
      ['a', 'b'],
      (id) => id,
      async (id) => {
        seen.push(id);
      },
    );

    expect(seen).toEqual(['a', 'b']);
  });

  it('keeps going past a failing item, then reports each failure by id', async () => {
    const seen: string[] = [];
    const broken = new Error('row is broken');

    const sweep = sweepEach(
      'class_reminders',
      ['a', 'b', 'c'],
      (id) => id,
      async (id) => {
        seen.push(id);
        if (id === 'b') throw broken;
      },
    );

    await expect(sweep).rejects.toThrow(SweepItemsFailed);
    await expect(sweep).rejects.toMatchObject({
      message: 'class_reminders failed for 1 item: b',
      failures: [{ id: 'b', error: broken }],
      cause: broken,
    });
    expect(seen).toEqual(['a', 'b', 'c']);
  });
});
