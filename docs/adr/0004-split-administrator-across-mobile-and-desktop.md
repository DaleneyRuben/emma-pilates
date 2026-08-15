# Split the Administrator across a mobile and a desktop surface

Status: accepted, payment confirmation extended to desktop by [ADR-0006](./0006-extend-payment-confirmation-to-desktop-admin.md)

The Administrator does two kinds of work that pull in opposite directions, so rather than pick one surface we split them by urgency. **Mobile** carries only the time-critical things that cannot wait for the admin to reach a desk: confirming or rejecting a pending transfer Payment, and cancelling a Session that has Bookings when no substitute Trainer can cover it. **Desktop web** carries the deliberate work: Back Office entry (Supplies, Withdrawals, Salary Payments, Expenses), the income/expense report, building the Session schedule, and managing Promotions and Expense Categories.

Payment confirmation drives the mobile half. A transfer Payment grants nothing while it sits pending, so a client who has genuinely paid stays locked out of a class until a human confirms — the case the push notification exists to prevent. That verification is mobile-native work despite first appearances: the client's proof is a screenshot taken on a phone, and the Administrator's bank app is on their own phone, so checking the money against the receipt means flipping between two apps that both already live there. A desktop is not the better place for it; it is merely a further place.

The desktop half is the reverse. Reconciling a month of expenses, reading a wide income/expense report, or laying out next week's schedule is tabular, deliberate work that is never urgent and is bad on a 390px viewport.

The rejected alternative was a single full-featured mobile admin app. The risk this ADR is guarding against is scope creep into the mobile half: once two admin actions live on the phone there is standing pressure to add a third, and the boundary that justifies the split — *is this urgent enough that a desk is too far away?* — is the test any proposed addition has to pass.
