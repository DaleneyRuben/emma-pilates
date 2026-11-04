import { isStorageObjectMissing } from './storage-object-missing';

const withProperties = (
  message: string,
  properties: Record<string, unknown>,
): Error => Object.assign(new Error(message), properties);

describe('isStorageObjectMissing', () => {
  it('recognizes a local file that does not exist', () => {
    expect(
      isStorageObjectMissing(withProperties('no file', { code: 'ENOENT' })),
    ).toBe(true);
  });

  it('recognizes an S3 NoSuchKey answer', () => {
    expect(
      isStorageObjectMissing(withProperties('missing', { name: 'NoSuchKey' })),
    ).toBe(true);
  });

  it('recognizes an S3 answer with HTTP 404', () => {
    expect(
      isStorageObjectMissing(
        withProperties('Not Found', {
          name: 'NotFound',
          $metadata: { httpStatusCode: 404 },
        }),
      ),
    ).toBe(true);
  });

  it('recognizes an S3 answer without a body', () => {
    expect(isStorageObjectMissing(new Error('storage_object_missing'))).toBe(
      true,
    );
  });

  it.each([
    ['a permission failure', withProperties('denied', { code: 'EACCES' })],
    [
      'an S3 outage',
      withProperties('Service Unavailable', {
        name: 'ServiceUnavailable',
        $metadata: { httpStatusCode: 503 },
      }),
    ],
    ['a refused key', new Error('storage_key_invalid')],
    ['a value that is not an error', 'ENOENT'],
    ['nothing', undefined],
  ])('treats %s as an outage, not a missing object', (_name, error) => {
    expect(isStorageObjectMissing(error)).toBe(false);
  });
});
