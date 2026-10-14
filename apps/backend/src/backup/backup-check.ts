export type StoredBackup = { key: string; size: number; lastModified: Date };

export type BackupProblem = { code: string; detail?: string };

export type BackupCheckReport = {
  passed: boolean;
  dailyCount: number;
  monthlyCount: number;
  latestDaily: { key: string; size: number; ageHours: number } | null;
  problems: BackupProblem[];
};

export const checkBackups = (input: {
  database: string;
  objects: StoredBackup[];
  now: Date;
}): BackupCheckReport => {
  throw new Error(`not implemented: ${input.database}`);
};
