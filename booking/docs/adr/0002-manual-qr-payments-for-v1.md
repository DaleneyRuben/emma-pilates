# Take payments by QR with manual confirmation in v1

Status: accepted

v1 has no payment processor. The studio displays a single fixed QR code in the app with the amount to pay printed beside it, the client transfers that amount from their own bank app and attaches a screenshot as proof, and an Administrator — alerted by a push notification — checks the money against the bank and confirms the Payment. We chose this over integrating a processor because the studio already collects money this way today and a processor is weeks of work plus per-transaction fees for a business taking a handful of payments a day.

Much of the Subscription model follows from this and would look arbitrary without it: there is no auto-renewal and no stored payment method, a Payment sits in a pending state that grants nothing until a human confirms it, cash Payments are confirmed on the spot by the Assistant taking the money, and Credit is applied to the amount displayed beside the QR rather than deducted from a charge. Adopting a processor is a v2 question, and doing so would reopen all of those.
