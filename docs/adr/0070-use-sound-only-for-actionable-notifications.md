# Use sound only for actionable notifications

Status: accepted

Push notifications use the standard operating-system sound only when the event is time-sensitive or requires timely action. Initial audible examples include Session cancellation or schedule changes, Waitlist promotion, upcoming Session or Evaluation reminders, rejected Payments, pending Payment review for an Administrator, and urgent Staff Member assignment changes. Routine confirmations, status echoes, and studio announcements are delivered silently while still appearing in the durable inbox and unread badge.

Notification type and sound urgency are separate, explicit fields in the project-owned notification catalog. A newly added event is silent unless its user journey justifies timely interruption and tests record that choice. The app uses standard platform sounds and channels rather than custom audio, does not request critical-alert privileges, and respects mute, focus, do-not-disturb, and notification-channel settings controlled by the user and operating system.

Sound for every notification was rejected because routine confirmations and announcements would train users to ignore alerts or disable permission entirely. Silent delivery for every notification was rejected because users could miss changes that affect an imminent appointment or action they must take.
