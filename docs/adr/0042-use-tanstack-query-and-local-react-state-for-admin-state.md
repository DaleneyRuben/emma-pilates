# Use TanStack Query and local React state for admin state

Status: accepted

The admin web application will use TanStack Query for backend-owned server state and React's local state primitives for temporary client-only state. A narrow React Context may hold low-frequency state that genuinely applies across distant parts of the application, such as the currently selected Branch. The application will not introduce Redux or Zustand initially.

State ownership will follow the concern closest to the state:

- TanStack Query owns REST query results, cache status, loading and error state, mutations, and refresh behavior. Query keys must explicitly include every scope that changes the result, including the selected Branch and relevant filters.
- TanStack Router owns durable or shareable navigation state such as filters, pagination, sorting, selected tabs, and report criteria. It remains the source of truth when table state must survive a refresh or appear in a copied URL.
- React Hook Form owns unsaved form values and form lifecycle, as established in [ADR-0041](./0041-use-react-hook-form-and-zod-for-admin-forms.md).
- TanStack Table owns temporary table presentation mechanics that do not belong in the URL.
- Component-local `useState` or `useReducer` owns temporary interface state such as open panels, menus, row selections, and drag interactions.
- Narrow React Context is reserved for low-frequency, application-wide coordination. It must not become a second cache for REST records or query results.

Admin features will consume the generated OpenAPI client required by [ADR-0018](./0018-use-rest-with-an-openapi-contract.md) through surface-specific query functions and options. A mutation must deliberately invalidate and refetch affected queries or update the cache when that behavior is safe for the workflow. Query data must not be copied into Context or local state merely to make it globally accessible. Mobile and admin web may share generated transport contracts, but they will not automatically share query hooks, cache policies, or view-specific query behavior.

Redux Toolkit with RTK Query was rejected because it would replace the already-selected TanStack Query model with a store-centric alternative and introduce reducers, middleware, and store conventions without a demonstrated admin requirement. TanStack Query with Zustand was rejected because Zustand would add another global state owner before any frequently changing cross-tree client state requires it. If such a requirement emerges and local state or narrow Context produces measurable coordination problems, the project may evaluate a dedicated store against that concrete case.

This decision does not select persistent browser caching, cache lifetimes, optimistic-update policy, or browser-session integration. Those choices remain workflow-specific or separate architecture decisions.
