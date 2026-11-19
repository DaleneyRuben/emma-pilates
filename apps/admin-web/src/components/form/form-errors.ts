import type { FieldErrors } from "react-hook-form";

export type InvalidField = { path: string; message: string };

const isLeafError = (value: object): boolean =>
  "type" in value && typeof (value as { type: unknown }).type === "string";

/**
 * Every field React Hook Form marked invalid, nested ones (a field array's
 * row, an object field) by their dotted path. The form-wide `root` error is
 * not a field and is left out.
 */
export function invalidFields(errors: FieldErrors): InvalidField[] {
  const found: InvalidField[] = [];
  const walk = (value: unknown, path: string) => {
    if (value === null || typeof value !== "object") return;
    if (isLeafError(value)) {
      const { message } = value as { message?: unknown };
      found.push({
        path,
        message: typeof message === "string" ? message : "",
      });
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (path === "" && key === "root") continue;
      walk(child, path === "" ? key : `${path}.${key}`);
    }
  };
  walk(errors, "");
  return found;
}

const labelFor = (path: string, labels: ReadonlyMap<string, string>) => {
  const parts = path.split(".");
  for (let length = parts.length; length > 0; length -= 1) {
    const label = labels.get(parts.slice(0, length).join("."));
    if (label !== undefined) return label;
  }
  return undefined;
};

/**
 * The summary's names: each invalid field's label (a nested field takes its
 * nearest labelled ancestor's), once, in the order the labels appear on the
 * form; then a field without a label by its own name (`nameOf`, such as its
 * aria-label), and last by its message.
 */
export function summaryLabels(
  invalid: readonly InvalidField[],
  labels: ReadonlyMap<string, string>,
  nameOf: (path: string) => string | undefined = () => undefined,
): string[] {
  const named = new Set<string>();
  const unnamed: string[] = [];
  for (const field of invalid) {
    const label = labelFor(field.path, labels);
    const fallback =
      label === undefined ? (nameOf(field.path) ?? field.message) : "";
    if (label !== undefined) named.add(label);
    else if (fallback !== "" && !unnamed.includes(fallback)) {
      unnamed.push(fallback);
    }
  }
  const ordered = [...new Set(labels.values())].filter((label) =>
    named.has(label),
  );
  return [...ordered, ...unnamed.filter((name) => !named.has(name))];
}

/** «Faltan N datos para guardar», singular for one. */
export const missingDataTitle = (count: number): string =>
  count === 1
    ? "Falta 1 dato para guardar"
    : `Faltan ${count} datos para guardar`;
