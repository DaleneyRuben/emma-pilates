# Limit signed object URLs

Status: accepted

A presigned direct-upload URL is valid for 15 minutes from issuance. It authorizes only the intended write method, server-generated pending-object key, declared media type, and available integrity constraints. If it expires before upload completes, the authenticated client may request a replacement URL for the same still-valid pending upload intent; renewal does not change ownership, purpose, declared metadata, or the intent's separate cleanup deadline. Finalization still verifies the stored bytes before the object can be used.

A private-view URL is valid for five minutes and is issued only after the backend reauthorizes the Account against the owning Payment, profile, or other resource. It is a bearer credential: clients do not persist it beyond the immediate view, and URLs are excluded from logs, analytics, errors, and notification payloads. A newly authorized request can obtain a fresh URL after expiry. Public published Promotion images use a separate public delivery policy and are not exposed through private signed links.

Sixty-minute URLs were rejected because copied or accidentally recorded links would remain useful longer than the workflows require. Five-minute upload URLs were rejected because slow or interrupted mobile connections would expire too often. The asymmetric 15-minute write and five-minute read windows balance mobile reliability with the narrower exposure expected for private content.
