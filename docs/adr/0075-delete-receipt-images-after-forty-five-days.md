# Delete receipt images after forty-five days

Status: accepted

Every finalized transfer-receipt image and all of its serving variants are deleted exactly 45 days after successful upload finalization. The deadline is based on the image's finalized timestamp rather than the Payment date, so a receipt uploaded late still receives the full retention period. Deletion removes the private object bytes and their live references while retaining the owning Payment record and its non-image business history.

The fixed deadline limits retention of sensitive banking screenshots and keeps storage use predictable. Keeping receipts for the lifetime of the Payment was rejected because the Payment record can outlive the period in which staff need the screenshot for review. Starting from the Payment date was rejected because a receipt added later could receive a shorter or already-expired retention period.
