# Retain pending Payment receipts and delete resolved receipts promptly

Status: accepted

Every finalized transfer-receipt image and all of its serving variants are retained while the owning Payment is pending. After the Payment is confirmed or rejected, the image is deleted at the later of 45 days after successful upload finalization or seven days after the Payment decision. Deletion removes the private object bytes and their live references while retaining the owning Payment record and its non-image business history.

The rule prevents review evidence from disappearing while a Payment still awaits a decision, gives staff a short post-decision verification window, and otherwise limits retention of sensitive banking screenshots. Keeping receipts for the lifetime of the Payment was rejected because the Payment record can outlive the period in which staff need the screenshot. Deleting every receipt at a fixed age regardless of Payment status was rejected because an unresolved Payment could lose its evidence before review.
