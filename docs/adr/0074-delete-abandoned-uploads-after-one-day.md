# Delete abandoned uploads after one day

Status: accepted

A pending upload intent and every object or failed processing artifact owned by it are eligible for deletion 24 hours after the intent was created unless finalization has successfully attached the resulting image to its intended resource. Renewing an expired signed URL does not extend this cleanup deadline. The cleanup process is idempotent, treats an already-missing object as success, and removes both the pending object and its obsolete database state.

The one-day window allows an interrupted first-party upload to be retried without retaining unattached content indefinitely. Immediate cleanup was rejected because a brief connection or app interruption should be recoverable. Longer retention was rejected because pending objects are neither useful application records nor approved serving assets.
