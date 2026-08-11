# Model Branch as a first-class entity from day one

Status: accepted

The studio currently operates a single location, but multiple branches are a known near-term requirement: clients will be able to book at any branch, Assistants will be scoped to specific branch(es), and Admins will see everything. We decided to model **Branch** as a real entity now — with Session, Evaluation/Availability Block, and staff-branch assignment all scoped to a Branch — rather than deferring it until a second location actually opens. Retrofitting a `branch_id` onto Sessions, Bookings, and staff-permission checks after there's live data and a shipped app is significantly more painful than carrying an effectively-unused foreign key today. Plans and Subscriptions remain studio-wide (not branch-specific), since a client's subscription should work at any branch.
