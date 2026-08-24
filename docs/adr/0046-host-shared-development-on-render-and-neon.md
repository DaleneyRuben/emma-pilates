# Host shared development on Render and Neon

Status: accepted

The persistent shared development API established in [ADR-0045](./0045-maintain-a-shared-development-api-and-database.md) will run as one Render Free web service, and its isolated PostgreSQL database will use one Neon Free project. The NestJS API remains the same containerized application used elsewhere; Render and Neon are development infrastructure adapters, not application or domain dependencies.

This environment deliberately accepts free-tier behavior. Render may stop the API after inactivity, so the first preview request can have a noticeable cold start. Neon may suspend idle compute and has finite monthly compute and storage allowances. Preview user experience must distinguish an environment waking up from an application failure, and the team accepts temporary suspension or unavailability rather than treating development as an always-on service.

Only the development API receives the Neon connection credential, using TLS and a deliberately small Prisma connection pool. Vercel previews receive only the public Render API origin. The Render service will initially run no continuously active development worker; background-job and notification behavior remains covered locally and in disposable CI until shared end-to-end job testing justifies another service. Development resets also remove queued development jobs so abandoned preview activity does not accumulate indefinitely.

The free accounts should not have an unrestricted payment path for this environment. Where a provider permits operation without a payment method, exhausting a free allowance should suspend development rather than create a charge. Usage alerts and the provider dashboards remain operational safeguards, and no production availability, backup, or recovery objective applies to this resettable synthetic data.

Koyeb Free with Neon was considered because Koyeb keeps an idle service awake longer and reports faster wake-up behavior, but it requires a payment card and adds accidental-spend exposure for similar constrained compute. A paid Northflank and Aiven development stack was rejected because closer production parity does not yet justify recurring cost. Render Free PostgreSQL was rejected because its free database expires after 30 days, while Neon's idle-scaling free project is a better fit for persistent low-usage development data.

Repeated quota exhaustion, unacceptable cold starts, insufficient memory, or the need for a shared development worker triggers reevaluation. Development API deployment cadence, preview access control, and full-stack pull-request compatibility remain separate decisions.
