# Runbook: add the missing uptime monitors in Better Stack

Better Stack watches only the API (`Production API readiness`, every 3
minutes). The admin web, the public pages, and the link host have no
monitor, so an expired certificate, a broken DNS record, or a Vercel or
Cloudflare outage would be found by a person (EXT-020). The free plan allows
10 monitors (one in use; heartbeats have their own allowance of 10, two in
use), so the three below cost nothing.

Every step is in the owner's Better Stack console, signed in from Brave;
an assistant cannot do them. Do them one at a time and check the result in
the list before the next. Afterwards update the «Monitoring» section of
[infrastructure](../architecture/infrastructure.md#monitoring) (the three
monitors are listed there as «to add by the user») and change its «Last
verified» date.

## The three monitors

| Name | URL to check | Expected | Why this URL |
| --- | --- | --- | --- |
| **Production admin web** | `https://emma-pilates-admin.vercel.app/` | HTTP 200, HTML | The app shell Vercel serves; any path answers it, and `/api/v1` is already covered by the API monitor. Checked 2026-10-21: 200 in about 1 s |
| **Public pages** | `https://app.emmapilatesstudio.com/` | HTTP 200, HTML | The Cloudflare Pages index (`/privacidad` answers a 308 redirect first, so the root is the plain check). Checked 2026-10-21: 200 |
| **Link host** | `https://links.emmapilatesstudio.com/.well-known/assetlinks.json` | HTTP 200, JSON | Proves the `links.` DNS record, Northflank's certificate for the custom domain, and the file Android's app links need (LNK-001); `/health/ready` on that host would only repeat the API monitor. Checked 2026-10-21: 200 |

Staging gets no monitors, by decision (ADR-0092): it is paused most of the
time.

## Steps (per monitor)

Settings copy the existing «Production API readiness» monitor, so the three
alert the same way. Open that monitor first (Uptime → Monitors → its row →
**Configure**) and keep its tab beside the new one to compare.

1. Open <https://uptime.betterstack.com/team/t614177/monitors> in Brave
   (team `t614177`). Select **Create monitor** (top right).
2. **Alert us when:** keep «URL becomes unavailable» (Better Stack then
   alerts on a timeout, a connection error, a certificate error, and any
   status outside 2xx–3xx; the existing monitor uses the same).
3. **URL to monitor:** paste the URL from the table, exactly, with `https://`.
4. **On-call escalation / Alert settings:** the same as the API monitor:
   **E-mail** on, call and SMS off (the free plan has e-mail only), no
   escalation. If the form shows «When to alert», choose **On-call person
   or everyone** as the API monitor does.
5. Open **Advanced settings** at the bottom of the form:
   - **Check frequency:** `3 minutes` (the fastest the free plan allows;
     the API monitor's value).
   - **Confirmation period:** `3 minutes` (the API monitor's value; a single
     failed probe does not alert, and the check from another region
     confirms it).
   - **Regions:** the same four as the API monitor (its Advanced settings
     list them; keep at least one in the Americas).
   - **Request timeout, HTTP method, expected status codes:** whatever the
     API monitor shows (Better Stack's defaults: 30 seconds, `GET`, any
     2xx–3xx). Add no request body or headers. Leave «Follow redirects» on.
   - **Verify SSL** on, and the **SSL expiration** alert on at Better
     Stack's default of 14 days (set the API monitor the same if it
     differs; Northflank, Vercel, and Cloudflare renew their certificates
     on their own, so this catches a renewal that silently stops).
   - **Domain expiration** alert on for the two `emmapilatesstudio.com`
     monitors (the domain expires 2027-10-15 with auto-renew on; this is a
     second reminder that costs nothing). Off for the `vercel.app` host.
6. **Monitor name:** the name from the table (the list shows it; the alert
   e-mail quotes it). Leave the group empty, or make one group «Emma
   Pilates production» and move the API monitor into it too.
7. Select **Create monitor**. The new row shows a grey «Pending» dot, then
   green **Up** within a check interval. If it shows **Down**, open the row:
   the error names the cause (a typo in the URL is the usual one); fix the
   URL with **Configure**.
8. Take one screenshot of the monitors list once all three are Up and keep
   it with the item's evidence.

## Prove one alert fires

Once, after the three are Up, see a real alert without breaking production:
open the **Production admin web** monitor → **Configure** → change the URL
to `https://emma-pilates-admin.vercel.app/api/v1/does-not-exist` (the proxy
answers 404, which «URL becomes unavailable» counts as down) → **Save**;
within about 6 minutes (3-minute check plus 3-minute confirmation) a «New
incident started» e-mail arrives; change the URL back and save; «Incident
resolved» arrives. Record the two e-mail times in the infrastructure page,
as the API monitor's were on 2026-10-13.

## When a monitor alerts

| Monitor | First look | Then |
| --- | --- | --- |
| Production admin web | <https://www.vercel-status.com>; Vercel → `emma-pilates-admin` → Deployments (is the latest Ready?) | Promote the previous deployment from Deployments; see the release runbook's «When a release fails» (admin web row) |
| Public pages | <https://www.cloudflarestatus.com>; Cloudflare → Workers & Pages → `emma-pilates-public` → Deployments | Retry the deployment, or roll back to the previous one from the same page |
| Link host | Cloudflare DNS (`links` CNAME present, DNS only); Northflank → `api` → Networking → Domains (certificate status) | If only `links.` fails while the API monitor is Up, the problem is DNS or the certificate, not the API; if both fail, follow the API alert and the [incident runbook](./incident-response.md) |

The monitors are listed in [infrastructure](../architecture/infrastructure.md#monitoring);
their alert e-mails go to the owner like the API monitor's.
