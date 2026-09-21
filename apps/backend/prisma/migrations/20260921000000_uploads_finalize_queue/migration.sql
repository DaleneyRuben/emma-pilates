SELECT pgboss.create_queue(
  'uploads.finalize.failed.v1',
  jsonb_build_object(
    'policy', 'standard',
    'retryLimit', 0,
    'retentionSeconds', 2592000,
    'deleteAfterSeconds', 2592000,
    'partition', false,
    'notify', false
  )
);

SELECT pgboss.create_queue(
  'uploads.finalize.v1',
  jsonb_build_object(
    'policy', 'standard',
    'retryLimit', 2,
    'retryDelay', 5,
    'retryBackoff', true,
    'retryDelayMax', 60,
    'expireInSeconds', 60,
    'retentionSeconds', 691200,
    'deleteAfterSeconds', 604800,
    'deadLetter', 'uploads.finalize.failed.v1',
    'partition', false,
    'notify', false
  )
);
