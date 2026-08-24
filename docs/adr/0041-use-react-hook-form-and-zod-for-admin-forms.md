# Use React Hook Form and Zod for admin forms

Status: accepted

The admin web application will use React Hook Form for form lifecycle and field state, with Zod schemas providing runtime validation and TypeScript inference for submitted form values. React Hook Form owns concerns such as values, touched and dirty state, field arrays, validation timing, submission state, and reset behavior. Zod defines the application-facing shape of each form and any deliberate conversion from browser input values into the corresponding generated REST request.

Project-owned shadcn fields and native inputs will register directly where practical. Controlled Radix components such as selects, date controls, and switches will integrate through React Hook Form's `Controller` boundary. Every field must retain a programmatic label, accessible description and error association, visible validation feedback, and the Administrator's entered values when a submission fails.

Client-side Zod validation improves feedback but is never an authorization, security, transport, or business-rule boundary. The NestJS backend validates every request and remains authoritative for business behavior. Admin form schemas are not backend DTOs, domain models, or Prisma models, and they are not automatically shared with mobile merely because both applications use Zod. Generated OpenAPI client types remain the transport contract; any intentional schema reuse must represent genuinely identical user input rather than duplicated business policy.

TanStack Form with Zod was rejected because its typed controlled model and advanced validation are capable but would introduce another form abstraction without a requirement that React Hook Form cannot meet. Native React form state with Zod was rejected because the admin's edit panels, dependent selects, date controls, dynamic rows, validation feedback, and failed-submission recovery would require rebuilding established lifecycle behavior. Reusing React Hook Form and Zod from the mobile stack reduces conceptual and dependency variety while preserving surface-specific schemas.

This decision does not define API field-error conventions, optimistic updates, unsaved-change navigation prompts, or which validation events each workflow uses. Those behaviors will be specified with the affected API and user journey.
