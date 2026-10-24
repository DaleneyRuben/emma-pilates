# Log equipment and its faults

Status: accepted (2026-10-23); partly reverses booking [ADR-0003](../../booking/docs/adr/0003-model-the-studio-as-branch-only.md), which kept equipment out of the model

The studio has 8 reformers, 8 cadillacs, and a mat area, and the owner wants faults recorded. Back Office gains **Equipment** (type and number per Branch) and **Equipment Issues** (date, description, out of service, resolved). A Trainer reports a fault from her agenda; an Administrator or the Coordinator resolves it. Sessions whose capacity exceeds the working machines of their kind are flagged so someone lowers the capacity; the system does not change capacity on its own.

There is still no Room: one Branch keeps one studio room, as ADR-0003 decided.
