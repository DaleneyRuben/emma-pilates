/** One visible text node, measured in the browser (see `collectTexts`). */
export type MeasuredText = {
  text: string;
  family: string;
  size: number;
  weight: number;
  color: string;
  background: string;
  opacity: number;
  upper: boolean;
  boxed: boolean;
  underlined: boolean;
};

export function findTypeProblems(
  _texts: MeasuredText[],
  _narrow: boolean,
): { text: string; problems: string[] }[] {
  void _texts;
  void _narrow;
  return [];
}

export async function collectTexts(_page: unknown): Promise<MeasuredText[]> {
  void _page;
  return [];
}
