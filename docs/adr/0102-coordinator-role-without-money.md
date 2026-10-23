# Add a Coordinator Role that runs operations without seeing money

Status: accepted (2026-10-23)

The studio has a marketing and operations coordinator. The owner gives her a Role of her own, `coordinator`, with access to the admin web's operational sections and to the Staff app, under one line: operations yes, money no.

She can create, change, and cancel Sessions and schedules, assign Trainers and substitutes, cancel a Session with Bookings, see and edit Client profiles and their Bookings, remaining classes, and expiry dates, see attendance, occupancy, new Clients, and renewals as counts, manage Staff details and schedules, and work the «Para contactar» list. She cannot see sales, revenue, the Cash Close, or any amount; confirm or void Payments; make courtesies or return classes; create Promotions or Campaigns; or see pay, including her own. In the Staff app she searches Clients and manages their Bookings like an Assistant, but never sells and never registers a new Client, which stays with the Assistant (owner, 2026-10-23).

Authorization stays in the backend use cases with default-deny tests ([ADR-0054](./0054-enforce-contextual-authorization-in-use-cases.md)); every endpoint gets an explicit Coordinator decision. The admin web hides the money sections, but the API is what enforces it.
