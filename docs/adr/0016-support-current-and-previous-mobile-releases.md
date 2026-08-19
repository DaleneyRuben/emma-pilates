# Support the current and previous mobile releases

Status: accepted

The backend API will support the currently published mobile release and the immediately previous published release. A backend deployment must not break either version. Once a newer mobile release is published, support may be removed for the version that has fallen outside this two-release window after the newer release is available to users.

Compatibility applies to behavior as well as message shape. Existing fields and operations used by either supported release retain their meaning. API evolution is additive inside the window: new response fields may be introduced, new request fields default safely when omitted, and removals or semantic changes wait until the consuming release leaves support. Database changes follow an expand-migrate-contract sequence when an old and new backend/client interpretation must coexist.

The admin web application is different: it is deployed by the studio rather than installed on user devices, so it can move in lockstep with the backend. It does not require the same two-release compatibility window, though it uses the same documented API boundary.

Supporting only the latest mobile release was rejected because staged rollouts, delayed updates, and users who have not opened the store could otherwise be locked out by a backend deployment. Supporting every historical release indefinitely was rejected because it would accumulate permanent behavior branches and prevent domain rules from evolving.

An exceptional forced update remains possible for a serious security or data-integrity issue, but it is an incident response rather than the normal release strategy. The eventual API technology and versioning mechanism must be able to enforce this policy.
