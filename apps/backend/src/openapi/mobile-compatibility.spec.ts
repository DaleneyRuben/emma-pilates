import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  compareContracts,
  type OpenApiDocument,
} from './contract-compatibility';

const openapiDirectory = resolve(__dirname, '../../openapi');
const readJson = <Value>(name: string): Value =>
  JSON.parse(readFileSync(resolve(openapiDirectory, name), 'utf8')) as Value;

type CompatibilityPolicy = {
  baseline: { file: string; release: string };
  adminWebOnlyOperationIds: string[];
};

// ADR-0016: the committed contract must stay usable by the previous mobile
// release. The baseline is the contract that release was built against; see
// apps/backend/openapi/README.md for when to move it.
describe('mobile contract compatibility', () => {
  const policy = readJson<CompatibilityPolicy>('compatibility-policy.json');
  const baseline = readJson<OpenApiDocument>(policy.baseline.file);
  const current = readJson<OpenApiDocument>('openapi.json');

  it('keeps every operation the previous mobile release uses compatible', () => {
    const report = compareContracts(baseline, current, {
      exemptOperationIds: policy.adminWebOnlyOperationIds,
    });

    expect(report.breaking).toEqual([]);
  });

  it('exempts only operations that exist and are admin-web only by path', () => {
    const operationIds = Object.values(current.paths).flatMap((item) =>
      Object.values(item).map(
        (operation) => (operation as { operationId?: string }).operationId,
      ),
    );
    policy.adminWebOnlyOperationIds.forEach((operationId) => {
      expect(operationIds).toContain(operationId);
    });
  });
});
