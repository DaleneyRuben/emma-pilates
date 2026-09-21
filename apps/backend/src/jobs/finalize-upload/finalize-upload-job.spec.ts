import {
  FINALIZE_UPLOAD_FAILED_QUEUE,
  FINALIZE_UPLOAD_QUEUE,
  finalizeUploadQueueOptions,
  parseFinalizeUploadJob,
} from './finalize-upload-job';

describe('finalize upload job contract', () => {
  const payload = {
    version: 1,
    imageAssetId: '63b83bb4-65b8-4e24-bbb3-b42c59d1e261',
  } as const;

  it('accepts the minimal versioned payload', () => {
    expect(parseFinalizeUploadJob(payload)).toEqual(payload);
  });

  it('rejects unexpected fields', () => {
    expect(() =>
      parseFinalizeUploadJob({ ...payload, pendingObjectKey: 'leaked/key' }),
    ).toThrow();
  });

  it('uses the approved queues and a tighter bounded retry preset for short internal work', () => {
    expect(FINALIZE_UPLOAD_QUEUE).toBe('uploads.finalize.v1');
    expect(FINALIZE_UPLOAD_FAILED_QUEUE).toBe('uploads.finalize.failed.v1');
    expect(finalizeUploadQueueOptions).toEqual({
      retryLimit: 2,
      retryDelay: 5,
      retryBackoff: true,
      retryDelayMax: 60,
      expireInSeconds: 60,
      retentionSeconds: 691_200,
      deleteAfterSeconds: 604_800,
      deadLetter: 'uploads.finalize.failed.v1',
    });
  });
});
