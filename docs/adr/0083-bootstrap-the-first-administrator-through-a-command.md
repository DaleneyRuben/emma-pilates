# Bootstrap the first Administrator through a one-time command

Status: accepted

The backend image will expose an explicit one-time command that provisions the first Administrator through the normal System Identity and Booking & Membership application boundaries. Given the intended email address through validated command configuration, it creates a pending Administrator Account and linked Staff Member, records the security-sensitive action, and transactionally enqueues the normal seven-day Activation Link email. It never accepts or generates an Administrator password.

The command is idempotent for the same pending email: rerunning it reuses the pending Account and may issue a replacement Activation Link under the established replacement and delivery controls. It fails without changing state when a different bootstrap Account is pending or any activated Administrator already exists. After the first Administrator is active, every later Staff Member is created through the authorized product workflow.

The command runs deliberately from the deployment image and never during API or worker startup. Automatic startup provisioning was rejected because a configuration mistake or restart must not create an Administrator. Manual SQL was rejected because it would bypass domain invariants, activation, auditing, and transactional email delivery.
