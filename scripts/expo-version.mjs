const pattern = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;

const parts = (version) => {
  const match = pattern.exec(version);
  if (match === null) throw new Error(`version must be x.y.z, got «${version}»`);
  return match.slice(1).map(Number);
};

/**
 * ADR-0107 and the mobile-release skill: the version a native release gets.
 * patch (the default) for fixes, minor for something new people can use,
 * major for a redesign or a forced update.
 */
export function releaseVersion(current, bump = "patch") {
  const [major, minor, patch] = parts(current);
  switch ((bump ?? "").trim() || "patch") {
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "major":
      return `${major + 1}.0.0`;
    default:
      throw new Error(`bump must be patch, minor or major, got «${bump}»`);
  }
}
