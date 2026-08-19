# Separate the system Account from Client and Staff Member identities

Status: accepted

Authentication is based on one system-level **Account**. An Account owns credentials, authenticated sessions, password recovery, and notification endpoints. It is linked to a domain identity: either a Client or a Staff Member. Authorization derives from that linked identity and, for a Staff Member, its exactly-one Role and assigned Branches.

Client and Staff Member remain separate domain concepts. A Client owns Subscriptions, Bookings, Evaluations, Credits, and Referrals; a Staff Member carries operational Role and Branch-assignment rules. Neither record owns a password, session, or recovery mechanism. Application use cases resolve the Account's linked domain identity before allowing an action, rather than treating a raw authenticated account as a Client or Staff Member.

The alternative is separate credential records and login flows for clients and staff. That duplicates account recovery and session behavior across the mobile app and makes permissions harder to reason about. It also wrongly couples credentials to a domain record that can change independently of sign-in concerns.

This decision deliberately does not choose an identity-provider technology. The Account boundary is ours regardless of whether credential verification is operated by the application or delegated to a provider.
