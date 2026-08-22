# External-provider audit — 2026-08-21

This audit rechecks every external service currently selected for the initial release. It compares current official limits with independent tests and community reports. Official documentation is authoritative for plan terms; Reddit and review-site reports are anecdotal signals used to identify operational risks, not proof of service-wide behavior.

The audit does not silently replace an accepted ADR. A recommendation to change a provider must be accepted in the architecture interview and then recorded in the owning ADR and [architecture roadmap](./README.md).

## Summary

| Provider | Purpose | Audit result | Recommendation |
| --- | --- | --- | --- |
| Northflank Sandbox | NestJS API and pg-boss worker | Reopen | Its own documentation says the free sandbox should not be used for production. Keep it only for a pilot with explicitly accepted availability and support risk, self-host on a free VM, or fund production compute. |
| Aiven Free | PostgreSQL | Keep with limits | It is a real managed PostgreSQL service with useful free capacity, but no SLA or support and only one node, 1 GB of disk, and 20 connections. Keep portable backups and a tested exit path. |
| Cloudflare R2 Standard | Uploaded images and portable database backups | Keep with safeguards | The free allowance and S3-compatible boundary still fit. Usage can become billable, free support is weak, and durability does not protect against deletion or account loss. Enforce application quotas and protect backups separately. |
| Expo Push Service | Mobile push notifications | Keep | It remains the smallest free integration for an Expo application. It has no delivery SLA, so push must remain optional and non-authoritative. |
| Vercel Hobby | Static admin web | Keep | The non-commercial use restriction matches this project, and a static Vite SPA fits comfortably within the hard free-plan limits. Do not move API or worker workloads onto it. |
| GitHub Actions | Continuous integration | Keep | Standard runners remain free for public repositories and include 2,000 minutes per month for private repositories on GitHub Free. A zero spending limit can stop work instead of creating an overage bill. |
| SendPulse | Transactional email | Replace | Its free quota is generous, but independent deliverability evidence and account-moderation reports are weaker than the evidence for SMTP2GO. For this project's low volume, inbox placement is more important than quota size. |

## Northflank Sandbox

Northflank currently includes two free services, two jobs, and one add-on with always-on compute. That shape uniquely accommodates a separate API and worker without sleeping. However, Northflank describes the Developer Sandbox as a way to test the platform and explicitly says it **should not be used for production applications**. Sandbox support is best-effort and has no SLA. Its paid 512 MB plan is currently $5.40 per container per month, so preserving separate API and worker processes would create a recurring compute cost.

Independent discussion about Northflank is much thinner than for older platforms. Reports generally like its container, worker, deployment, and observability model, while support reviews are mixed. The lack of a large independent evidence base increases rather than removes the risk.

No alternative managed PaaS found in this audit provides two always-on production services indefinitely for free. Koyeb's free instance also says it is not for production, permits only one web service, cannot run a worker, and sleeps after an hour. Oracle Cloud Always Free can run the application on a VM, but the project would own operating-system patching, container operations, TLS, monitoring, deployment recovery, and host security; Oracle may also reclaim idle free instances.

Recommendation: reopen [ADR-0027](../adr/0027-deploy-the-initial-backend-on-northflank-with-aiven-postgresql.md). The honest choices are a risk-accepted Northflank pilot, a self-managed free VM, or a small paid production service. Do not continue describing Sandbox as production-ready.

Sources: [Northflank pricing](https://northflank.com/pricing), [Northflank Sandbox warning](https://northflank.com/docs/v1/application/billing/pricing-on-northflank), [Northflank community comparison](https://www.reddit.com/r/Heroku/comments/1likb1c/recent_outage_was_the_last_straw_for_me_what_i/), [Northflank customer reviews](https://www.trustpilot.com/review/northflank.com), [Koyeb free-instance limits](https://www.koyeb.com/docs/reference/instances), and [Oracle Always Free limits and reclamation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

## Aiven Free PostgreSQL

Aiven Free currently provides a single-node PostgreSQL service with 1 CPU, 1 GB RAM, 1 GB disk, monitoring, logs, extensions, and provider backups without requiring a credit card. It has no time limit. Its important constraints are no SLA, no support, no built-in connection pooler, no static IP, one service per organization, and a 20-connection maximum. Aiven can power down a free service after continued inactivity and can change its region or configuration.

This remains a better match than Neon Free for the continuously connected pg-boss worker. Neon Free is optimized around scale-to-zero and currently provides 0.5 GB of storage. Supabase Free also provides 0.5 GB, pauses inactive projects, and excludes automatic backups. Community reports about Aiven Free are mixed on latency and inactivity handling but consistently recognize the larger free database and conventional PostgreSQL connection model.

Recommendation: keep Aiven for the low-traffic initial release, cap the API and worker connection pools, monitor disk growth, create daily logical dumps outside Aiven, and test restoration. Treat provider backups as an extra recovery layer rather than the only backup. Move when storage, latency, availability, or support becomes material.

Sources: [Aiven Free limits](https://aiven.io/docs/products/postgresql/concepts/pg-free-tier), [Aiven backup behavior](https://aiven.io/docs/products/postgresql/concepts/pg-backups), [Aiven community discussion](https://www.reddit.com/r/PostgreSQL/comments/1v8uvtb/looking_for_a_simple_managed_postgres_service/), [free-database community comparison](https://www.reddit.com/r/Database/comments/1qq4wzh/free_postgresql_hosting_options/), [Neon compute behavior](https://neon.com/docs/manage/endpoints/), and [Supabase plan limits](https://supabase.com/pricing).

## Cloudflare R2 Standard

R2 Standard currently includes 10 GB-month of storage, one million Class A operations, ten million Class B operations, and free internet egress each month. Overage is usage-based, rounded up to billing units, and is not described as a hard free-tier stop. Infrequent Access has retrieval fees and does not receive the free allowance, so it is inappropriate for the initial implementation.

R2 is strongly consistent, encrypts data at rest and in transit, targets eleven nines of durability, and publishes a 99.9% availability SLA. Its S3 API is not complete, but the operations required by the documented signed-upload workflow are supported. Community reports identify slow free-tier billing support and service suspension after payment problems as practical risks. R2 durability also does not protect against accidental deletion, stolen credentials, or account suspension.

Recommendation: keep R2 Standard. Enforce file-size and per-Account quotas before issuing upload intents, retain private application-level metadata in PostgreSQL, use narrowly scoped bucket credentials, configure billing alerts, and do not enable Infrequent Access accidentally. Protect database dumps with a separate bucket and bucket locks. A second-provider copy of irreplaceable objects becomes necessary before R2 is treated as their only recoverable copy.

Sources: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [durability and availability](https://developers.cloudflare.com/r2/reference/durability/), [data security](https://developers.cloudflare.com/r2/reference/data-security/), [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), [billing-support report](https://www.reddit.com/r/CloudFlare/comments/1td1qn7/cloudflare_blocked_my_r2_over_a_failed_payment/), and [backup discussion](https://www.reddit.com/r/CloudFlare/comments/1qyjmjs/do_you_replicatebackup_data_of_your_r2_bucket_in/).

## Expo Push Service

Expo Push Service remains free and currently accepts up to 600 notifications per second per project. It queues messages for APNs and FCM, returns tickets, and requires the backend to retrieve receipts. Expo recommends checking receipts after 15 minutes and deletes them after 24 hours. Expo, APNs, and FCM provide no end-to-end delivery guarantee, and Expo explicitly provides no SLA.

Community reports show both long-running successful production use and cases involving delayed delivery, invalid tokens, production credential mistakes, and Android manufacturer battery restrictions. Some of those problems exist at APNs, FCM, or device level and would not be solved by changing the intermediary. OneSignal provides unlimited mobile push on its free plan and useful campaign tooling, but its SDK creates another user-data system and its DPA and Standard Contractual Clauses are paid-plan features. The project does not currently need its segmentation or marketing features.

Recommendation: keep Expo Push Service. Continue using durable pg-boss jobs, exponential backoff, receipt checks, invalid-token deactivation, and provider-independent endpoints. Never use push as proof of delivery or as the only place a user can discover a booking, payment, or account change. Revisit OneSignal only when product requirements need campaigns, journeys, or non-engineer-operated segmentation.

Sources: [Expo sending and receipt guidance](https://docs.expo.dev/push-notifications/sending-notifications/), [Expo cost and limits](https://docs.expo.dev/push-notifications/faq/), [production community discussion](https://www.reddit.com/r/reactnative/comments/1i23aex/any_realworld_feedback_on_expo_push_notifications/), [Expo community scaling discussion](https://www.reddit.com/r/expo/comments/1pmdyru/how_do_you_handle_push_notifications_in_expo_apps/), [OneSignal pricing](https://onesignal.com/pricing), and [OneSignal personal-data behavior](https://documentation.onesignal.com/docs/en/handling-personal-data).

## Vercel Hobby

Vercel Hobby is restricted to personal and non-commercial use, which matches the user's stated purpose for this application. It currently includes one million edge requests and 100 GB of fast data transfer per month. Hobby cannot buy on-demand usage, so exceeding a cap stops or restricts service instead of creating an automatic usage bill. A project on a Hobby team cannot connect directly to a Git repository owned by a GitHub organization.

Community discussions often prefer Cloudflare Pages for more generous static-site limits, while complaints about Vercel costs primarily concern paid plans and server-side workloads. This admin web is a static Vite SPA whose images live in R2 and whose dynamic work belongs to the NestJS API, so those cost patterns do not apply directly. Keeping Vercel also avoids putting the admin UI and object storage under the same provider account.

Recommendation: keep Vercel Hobby for the static admin web. Use a personal repository connection or a deployment workflow compatible with the account, monitor bandwidth, and do not add Vercel Functions, Blob, or other metered backend responsibilities without a new decision.

Sources: [Vercel pricing and Hobby limits](https://vercel.com/pricing), [Vercel platform limits](https://vercel.com/docs/limits), [Vercel terms](https://vercel.com/legal/terms), [static-hosting community discussion](https://www.reddit.com/r/statichosting/comments/1okpi5j/is_vercel_overkill_for_simple_static_sites_now/), and [Vercel alternatives discussion](https://www.reddit.com/r/webdev/comments/1ihswi9/cloudflare_vercel_or_netlify_which_one_actually/).

## GitHub Actions

GitHub Actions remains free for standard GitHub-hosted runners in public repositories. GitHub Free currently includes 2,000 runner minutes and 500 MB of shared artifact and package storage per month for private repositories. Without a valid payment method, GitHub blocks usage after the included quota instead of charging an overage. Larger runners are always billable.

The main risks are quota exhaustion, artifact-storage growth, workflow maintenance, third-party action supply-chain exposure, and dependence on GitHub availability. None outweighs the benefit of a CI gate integrated with the repository. The disposable PostgreSQL service-container design remains portable to another CI provider.

Recommendation: keep GitHub Actions. Use Linux standard runners, short artifact retention, dependency caching with limits, a zero spending limit, least-privilege workflow permissions, and commit-SHA pinning for third-party actions. Never connect CI to production Aiven or reuse production credentials.

Sources: [GitHub Actions billing and usage](https://docs.github.com/en/actions/concepts/billing-and-usage), [included quotas and blocking behavior](https://docs.github.com/en/billing/concepts/product-billing/github-actions), and [workflow-security research](https://arxiv.org/abs/2208.03837).

## Transactional email

SendPulse still advertises 12,000 free transactional emails per month. Its recent public status history is strong, and some low-volume users report satisfactory SMTP results. However, recent reviews also describe SMTP access being blocked during opaque manual moderation. More importantly, EmailTooltester ran four rounds across international mailbox providers and reported average inbox placement of 74% for SendPulse versus 96% for SMTP2GO. A seed-list test cannot predict this project's exact results, and domain reputation remains important, but it is better independent evidence than quota size alone.

SMTP2GO's permanent free plan provides 1,000 messages per month and 200 per day without a credit card. It hard-stops at the monthly quota rather than creating an overage bill, supports a verified sending domain, API or SMTP, bounce and complaint suppression, and one webhook on the free plan. Free reporting history is only five days. Community reports are consistently positive about setup, support, and deliverability, although provider and Microsoft incidents still occur. Its public status page reported 100% uptime for April through June 2026.

Recommendation: replace SendPulse with SMTP2GO if 1,000 messages per month and 200 per day cover projected verification, recovery, security, and operational email. Preserve the project-owned delivery interface, disable open and click tracking for authentication email, authenticate the sending domain with SPF, DKIM, and DMARC, process bounce and complaint events, alert before quota exhaustion, and keep critical recovery possible through an audited staff-assisted fallback. If measured demand approaches the quota, compare SMTP2GO's paid plan with Postmark and AWS SES rather than degrading authentication delivery.

Sources: [SendPulse transactional allowance](https://sendpulse.com/features/transactional), [SendPulse reviews and moderation report](https://www.trustpilot.com/review/sendpulse.com), [independent SMTP deliverability test](https://www.emailtooltester.com/en/blog/free-smtp-servers/), [SMTP2GO free limits](https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan), [SMTP2GO pricing and no-card policy](https://www.smtp2go.com/pricing/), [SMTP2GO webhook behavior](https://developers.smtp2go.com/docs/webhooks-overview), [SMTP2GO uptime](https://smtp2gostatus.com/uptime), and [SMTP2GO community experience](https://www.reddit.com/r/selfhosted/comments/1hr7bi5/smtp2go_free_plan_spam_score/).

## Decisions to revisit

Resolve these one at a time before returning to email-verification policy:

1. Decide whether the first public release may run as an explicitly risk-accepted Northflank pilot, must use a self-managed free VM, or may fund production compute.
2. Decide whether to replace SendPulse with SMTP2GO under the 1,000-per-month and 200-per-day limits.

The other five providers remain suitable for the initial release provided their safeguards above become part of implementation and operational readiness.
