SELECT pgboss.create_queue(
  'notifications.push-dispatch.failed.v1',
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
  'notifications.push-dispatch.v1',
  jsonb_build_object(
    'policy', 'standard',
    'retryLimit', 5,
    'retryDelay', 30,
    'retryBackoff', true,
    'retryDelayMax', 900,
    'expireInSeconds', 60,
    'retentionSeconds', 691200,
    'deleteAfterSeconds', 604800,
    'deadLetter', 'notifications.push-dispatch.failed.v1',
    'partition', false,
    'notify', false
  )
);
