export type FactSource = {
  sessions: unknown[];
  clients: unknown[];
};

export const recomputeFacts = (
  source: FactSource,
  month: Date,
): { sessions: unknown[]; clientMonths: unknown[] } => {
  void source;
  void month;
  return {
    sessions: [],
    clientMonths: [],
  };
};
