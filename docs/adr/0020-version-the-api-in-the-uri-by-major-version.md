# Version the API in the URI by major version

Status: accepted

Every versioned application endpoint is served below a major-version URI prefix, beginning with `/api/v1`. The API major version is independent of mobile and admin application release numbers.

Changes within a major API version are backward compatible under [ADR-0016](./0016-support-current-and-previous-mobile-releases.md). New optional request fields, new response fields, and new endpoints may be added to `v1`; removing fields, making optional input required, changing a field's meaning, or changing established behavior requires waiting until no supported client depends on it or introducing a new major API version.

A new major version is introduced only for a genuinely incompatible contract, not for every product release. NestJS may route the same controller or operation to multiple API versions when behavior is unchanged. When behavior diverges, version-specific transport adapters map into the same application use cases where possible rather than duplicating domain logic.

URI versioning was selected because `/api/v1/...` is visible in logs, traces, generated-client configuration, manual requests, and support diagnostics. Header and media-type versioning provide cleaner resource URLs but make the selected contract less obvious. Starting unversioned was rejected because the first breaking change would force already-installed mobile clients to move from an implicit version to a new routing scheme.

Version-neutral endpoints are reserved for infrastructure concerns such as health checks. Application capabilities do not silently bypass versioning.
