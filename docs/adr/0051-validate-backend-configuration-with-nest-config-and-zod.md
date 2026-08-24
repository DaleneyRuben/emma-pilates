# Validate backend configuration with Nest Config and Zod

Status: accepted

The backend will use `@nestjs/config` with a project-owned Zod validation layer. Every executable entrypoint—API, worker, and migration command—must validate and convert its required environment variables before opening listeners, connecting to providers, or performing database work. Invalid or missing configuration stops startup with an actionable error that identifies the setting but never prints secret values.

Configuration schemas are composed from a small shared base and entrypoint-specific requirements. This prevents an API process from requiring worker-only settings and lets migration commands validate only the database and migration settings they use. String values such as ports, URLs, booleans, and constrained modes are converted explicitly rather than relying on permissive implicit coercion.

The validated result is the typed configuration boundary for backend application code. Direct `process.env` reads are limited to configuration bootstrap code; domain logic, application services, controllers, repositories, and job handlers receive typed configuration through dependency injection or narrow configuration interfaces. A standalone command may call the same Zod parser without bootstrapping the full Nest application.

Local development may load ignored `.env` files, while deployed environments receive variables from their hosting provider. Environment-specific values and secrets are never committed. Exact variable names, provider wiring, and secret-rotation procedures will be defined with the executable and deployment configuration.

Joi was rejected because it would add a second schema vocabulary beside the Zod already selected for client forms and offers weaker TypeScript inference for this project. Envalid was rejected because it introduces another configuration abstraction without improving the required NestJS integration or typed schema composition.
