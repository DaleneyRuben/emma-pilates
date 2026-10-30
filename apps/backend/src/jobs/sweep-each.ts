// One item of a sweep that fails must not stop the others. Once every item
// has run, the failures surface together, named by id, so the sweep runner
// reports them (EXT-011) instead of the job swallowing them.
export class SweepItemsFailed extends Error {
  constructor(
    readonly job: string,
    readonly failures: readonly { id: string; error: unknown }[],
  ) {
    super(
      `${job} failed for ${failures.length} item${failures.length === 1 ? '' : 's'}: ${failures.map((failure) => failure.id).join(', ')}`,
      { cause: failures[0]?.error },
    );
    this.name = 'SweepItemsFailed';
  }
}

export const sweepEach = async <Item>(
  job: string,
  items: readonly Item[],
  idOf: (item: Item) => string,
  work: (item: Item) => Promise<void>,
): Promise<void> => {
  const failures: { id: string; error: unknown }[] = [];
  for (const item of items) {
    try {
      await work(item);
    } catch (error) {
      failures.push({ id: idOf(item), error });
    }
  }
  if (failures.length > 0) throw new SweepItemsFailed(job, failures);
};
