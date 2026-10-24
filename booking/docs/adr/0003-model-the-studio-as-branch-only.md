# Model the physical studio as Branch only — no Room, no Equipment

Status: accepted; Equipment is modelled in Back Office since [ADR-0106](../../../docs/adr/0106-log-equipment-faults.md), still without a Room

Each Branch has exactly one studio room, so two Sessions at the same Branch never overlap in time and a Branch's schedule is simply one class after another. We decided not to introduce a Room concept, and not to model Equipment (reformers and the like) as countable, serviceable things: a Session's capacity defaults from its Class Type and staff override it by hand on the rare day something is out of service, with the reason living in their heads rather than in the model.

This deliberately does not follow [ADR-0001](./0001-model-branch-as-first-class-entity.md), which argues for modelling Branch before a second location exists. The difference is what each bet costs: a second branch is a business plan the studio already has, whereas a second room means a materially bigger lease at one site, and an equipment inventory is a subsystem nothing in the product asks for. If a Branch ever gains a second room, Room becomes real and Session has to point at one; capacity moving from Class Type to Branch is the cheaper, likelier first step, since it only changes which number is suggested when a Session is created.
