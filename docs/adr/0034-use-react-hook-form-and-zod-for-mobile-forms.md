# Use React Hook Form and Zod for mobile forms

Status: accepted

The Expo mobile application will use React Hook Form for form state, field interaction, submission state, and client-visible errors, with Zod schemas providing runtime validation and inferred TypeScript input types. React Native inputs will be connected through narrow reusable field components rather than repeating controller wiring in every screen.

This combination provides a small, established form-state layer while validating values that TypeScript cannot verify at runtime. Zod schemas on the mobile boundary may enforce input shape and immediate usability checks, but they do not replace backend DTO validation, authorization, database constraints, or domain rules. RFC 9457 responses from the generated REST client must be mapped to stable form-level or field-level feedback without branching on human-readable server messages.

TanStack Form with Zod was considered for its strong typing and form composition, but its additional form model is not justified by the known mobile workflows. Formik with Yup was rejected because it is less aligned with the project's TypeScript-first runtime schemas. Handwritten React state was rejected because it would duplicate touched, dirty, validation, and submission behavior across Login, Sign Up, payment, profile, and Evaluation forms.

This decision applies to the mobile application only. It does not select admin-web form handling, determine which validation schemas can be shared across applications, or permit client schemas to become a second source of truth for backend business behavior.
