# Use SendPulse for transactional email

Status: accepted

The initial release will send transactional email through SendPulse's managed service. The NestJS backend will depend on a project-owned email-delivery interface, with SendPulse credentials, API types, and delivery behavior confined to an infrastructure adapter. Authentication and other application modules must express the message to send without depending directly on SendPulse, so another provider can replace it without changing domain or application logic.

SendPulse was selected because its permanent free plan currently provides substantially more transactional-email capacity than the expected needs of the studio, requires no credit card, and includes API and SMTP delivery, authenticated sending domains, and delivery-status webhooks. A managed service also avoids operating email infrastructure, sender reputation, and the AWS SES dependency required by a self-hosted Plunk deployment.

Hosted Plunk was the preferred open-source alternative, but its smaller free allowance and limited operational advantage did not justify choosing it solely for source availability; self-hosting it would add another deployed application while still relying on an external delivery network. Resend was the preferred developer-experience alternative, SMTP2GO the established low-volume alternative, and Brevo the higher-daily-quota alternative, but each offered less free capacity than SendPulse at the time of this decision. Free-tier terms are an external constraint rather than an architectural guarantee and must be checked before production launch.

The studio must own and authenticate a sending domain. Provider failure, quota exhaustion, bounce and complaint handling, retry policy, delivery-event retention, message templates, and the precise email-verification and password-recovery journeys remain separate decisions. Transactional email is not proof that a person received or read a message.
