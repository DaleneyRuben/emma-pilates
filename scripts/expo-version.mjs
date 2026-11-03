const pattern = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;

const parts = (version) => {
  const match = pattern.exec(version);
  if (match === null) throw new Error(`version must be x.y.z, got «${version}»`);
  return match.slice(1).map(Number);
};

const later = (a, b) => {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
};

/**
 * ADR-0107: the version a native release gets. Blank means the next patch of
 * the current one (1.0.2 → 1.0.3); a typed x.y.z must be later than it.
 */
export function releaseVersion(current, requested) {
  const now = parts(current);
  const typed = (requested ?? "").trim();
  if (typed === "") return `${now[0]}.${now[1]}.${now[2] + 1}`;
  if (!later(parts(typed), now)) {
    throw new Error(`version must be later than ${current}, got «${typed}»`);
  }
  return typed;
}
