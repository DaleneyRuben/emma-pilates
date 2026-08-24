# Generate API contracts with Orval

Status: accepted

The `api-contracts` workspace package will use Orval to generate TypeScript transport models, native Fetch request functions, and TanStack Query integration from the committed NestJS OpenAPI document. The generated client must work in both the Expo mobile application and the Vite admin web application without introducing Axios or importing backend source code.

Applications own their QueryClient configuration, cache lifetimes, invalidation policy, user-facing error handling, and authentication transport setup. Generated query keys and query or mutation helpers may be reused, but generated code must not embed environment URLs, credentials, platform-specific storage, or product behavior. A narrow project-owned Fetch adapter or Orval mutator may supply the per-application base URL, headers, cookies, cancellation, and RFC 9457 normalization without editing generated files.

The OpenAPI document and Orval output are reviewed, committed build artifacts. Generation runs from a repository script with an exactly pinned Orval version. Continuous integration regenerates the OpenAPI document and `api-contracts` output and fails when either produces a working-tree diff, ensuring clients can build without reaching a running backend and that contract changes remain visible in review. Generated files are never edited by hand and the package is consumed directly through the pnpm workspace rather than published for the initial first-party applications.

`openapi-typescript` with `openapi-fetch` was rejected because it would leave more operation and TanStack Query integration code to maintain manually. Hey API offered a comparable Fetch SDK and plugin model, but added flexibility the project does not currently need. OpenAPI Generator's `typescript-fetch` target was rejected because its broader, heavier generator model and documented schema-feature gaps are a weaker fit for these two TypeScript clients.
