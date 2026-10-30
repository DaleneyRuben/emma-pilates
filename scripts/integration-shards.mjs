// EXT-023: Jest's --shard splits by sorted path, which piled the slow files
// into shards 1 and 6 (2m 53s and 3m 03s on run 40238852703). These groups
// spread the files whose CI time we measured. An unlisted file joins the
// lightest group, so a new spec cannot recreate a long shard.
// FIX-011: each piece is an anchored, regex-escaped basename so a longer
// name (account-closure-promotions-consent…) never matches a shorter one
// (promotions-consent…) under --testPathPattern.
const measuredSeconds = {
  "interrupted-run.integration-spec.ts": 16.5,
  "database-test-context.integration-spec.ts": 13.1,
  "authorization-matrix.integration-spec.ts": 12.3,
  "s3-object-storage.integration-spec.ts": 11.4,
  "booking-command-waitlist.integration-spec.ts": 8.3,
  "founder-membership.integration-spec.ts": 7.9,
  "payment-lifecycle-administration.integration-spec.ts": 7.3,
  "client-registration.integration-spec.ts": 7.3,
  "schedule-administration.integration-spec.ts": 6.6,
  "revenue-report.integration-spec.ts": 6.5,
  "notification-push-recording.integration-spec.ts": 6.4,
  "receipt-read.integration-spec.ts": 6.4,
  "session-start-checks.integration-spec.ts": 6.1,
  "payment-lifecycle.integration-spec.ts": 6.1,
  "account-security.integration-spec.ts": 6.1,
  "back-office-supplies.integration-spec.ts": 6.0,
  "evaluation-availability.integration-spec.ts": 5.8,
  "guest-pass.integration-spec.ts": 5.8,
  "back-office-cash-closes.integration-spec.ts": 5.8,
  "payment-commands.integration-spec.ts": 5.7,
  "staff-management.integration-spec.ts": 5.6,
  "development-fixtures.integration-spec.ts": 5.2,
  "upload-commands.integration-spec.ts": 5.1,
  "client-registration-runtime.integration-spec.ts": 5.1,
};

const ownJob = new Set(["s3-backup-store.integration-spec.ts"]);
const unknownSeconds = 2;
const shardCount = 6;

export function integrationShardPattern(files, shard) {
  const groups = Array.from({ length: shardCount }, () => []);
  const loads = Array.from({ length: shardCount }, () => 0);
  const pending = files
    .filter((file) => !ownJob.has(file.split("/").pop()))
    .sort((left, right) => weight(right) - weight(left) || left.localeCompare(right));
  for (const file of pending) {
    const index = loads.indexOf(Math.min(...loads));
    groups[index].push(file);
    loads[index] += weight(file);
  }
  const names = groups[shard - 1].map((file) => {
    const base = file.split("/").pop();
    return `(^|/)${escapeRegExp(base)}$`;
  });
  return names.join("|");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function weight(file) {
  return measuredSeconds[file.split("/").pop()] ?? unknownSeconds;
}
