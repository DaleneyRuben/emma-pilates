# Limit images by upload purpose

Status: accepted

The API issues upload intents only for three initial purposes with explicit limits. A transfer-receipt image accepts JPEG, PNG, or WebP up to 10 MB and 6,000 pixels on either axis. A Client or Staff Member profile photo accepts the same formats up to 5 MB and 4,096 pixels on either axis. A Promotion image accepts the same formats up to 20 MB and 6,000 pixels on either axis. Animated images, SVG, PDF, HEIC, and other formats are not accepted initially; first-party clients convert a selected unsupported image to an accepted format before requesting or using an upload intent.

The backend checks declared media type and byte size before issuing the signed URL, then independently verifies actual byte size, decoded format, width, and height during finalization. A filename extension or client-supplied `Content-Type` never proves the format. Invalid images remain unusable in the pending namespace and return RFC 9457 Problem Details with a stable reason code. Purpose-specific Account and system quotas may reject a new intent even when one file is individually valid.

One 5 MB limit for every purpose was rejected because readable receipt details and prepared Promotion artwork may need more input data than a profile photo. A permissive 20 MB rule for every image was rejected because profile photos and receipts do not need that storage and processing allowance. Supporting many source formats was rejected because the first-party clients can normalize three known workflows without expanding decoder and security complexity on the backend.
