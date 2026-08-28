# Represent Money Amounts as BOB centavos

Status: accepted

Every Money Amount is denominated in Bolivianos (BOB) and represented as an integer number of centavos in PostgreSQL, TypeScript, and the REST API. For example, Bs 150.50 is represented as `15050`. Plan prices, Payments, Credits, Expenses, and Salary Payments all use this representation; no workflow accepts, stores, displays, or converts another currency.

PostgreSQL `integer` columns are sufficient for the studio's expected values and keep the same exact representation across the database, backend, OpenAPI contract, and JavaScript clients. Amounts must be non-negative unless a specifically modeled future concept requires a signed value. Arithmetic never creates a fraction of one centavo, and user-facing applications format the integer as BOB only at the presentation boundary.

Floating-point numbers were rejected because ordinary binary floating-point arithmetic cannot represent every decimal amount exactly. PostgreSQL `numeric(12,2)` was rejected initially because exposing decimal values safely to JavaScript clients would require a second string or decimal-library representation without providing useful precision beyond one centavo for these workflows. Supporting multiple currencies was rejected because every documented studio transaction is in Bolivia.
