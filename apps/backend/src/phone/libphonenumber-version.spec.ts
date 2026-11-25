import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dependency = (manifest: string): string =>
  (
    JSON.parse(readFileSync(join(__dirname, manifest), 'utf8')) as {
      dependencies: Record<string, string>;
    }
  ).dependencies['libphonenumber-js'];

// The apps and the admin web check a phone with `@pilates/phone-number`; the
// backend checks it again here. Different metadata could let an app accept a
// number the registration then refuses, so both pin the same release.
it('pins the same libphonenumber-js as the apps and the admin web', () => {
  expect(dependency('../../package.json')).toBe(
    dependency('../../../../packages/phone-number/package.json'),
  );
});
