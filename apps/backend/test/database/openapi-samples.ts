// IDN-009: plausible request bodies and query strings built from the OpenAPI
// document, so the authorization matrix reaches the authorization check of
// controllers that validate their input first.

type Schema = {
  $ref?: string;
  type?: string;
  format?: string;
  enum?: unknown[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  minimum?: number;
  minLength?: number;
  nullable?: boolean;
  example?: unknown;
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
};

type Document = {
  components?: { schemas?: Record<string, Schema> };
  paths: Record<string, Record<string, unknown>>;
};

type Operation = {
  parameters?: {
    in: string;
    name: string;
    required?: boolean;
    schema?: Schema;
  }[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
};

const sampleUuid = '00000000-0000-4000-8000-000000000000';

const resolve = (document: Document, schema: Schema): Schema => {
  if (schema.$ref === undefined) return schema;
  const name = schema.$ref.split('/').pop() ?? '';
  return document.components?.schemas?.[name] ?? {};
};

export const sampleOf = (
  document: Document,
  input: Schema,
  depth = 0,
): unknown => {
  const schema = resolve(document, input);
  const variant = schema.oneOf?.[0] ?? schema.anyOf?.[0] ?? schema.allOf?.[0];
  if (variant !== undefined) return sampleOf(document, variant, depth + 1);
  if (schema.enum !== undefined) return schema.enum[0];
  if (schema.example !== undefined) return schema.example;
  switch (schema.type ?? (schema.format === undefined ? undefined : 'string')) {
    case 'string':
      switch (schema.format) {
        case 'uuid':
          return sampleUuid;
        case 'date':
          return '2030-01-07';
        case 'date-time':
          return '2030-01-07T15:00:00.000Z';
        case 'email':
          return 'muestra@example.com';
        default:
          return 'm'.repeat(Math.max(schema.minLength ?? 1, 8));
      }
    case 'integer':
    case 'number':
      return Math.max(schema.minimum ?? 1, 1);
    case 'boolean':
      return true;
    case 'array':
      return depth > 4 || schema.items === undefined
        ? []
        : [sampleOf(document, schema.items, depth + 1)];
    default: {
      if (schema.properties === undefined || depth > 4) return {};
      return Object.fromEntries(
        Object.entries(schema.properties).map(([name, property]) => [
          name,
          sampleOf(document, property, depth + 1),
        ]),
      );
    }
  }
};

export const sampleRequest = (
  document: Document,
  method: string,
  path: string,
): { body?: unknown; query: string } => {
  const operation = (document.paths[path]?.[method] ?? {}) as Operation;
  const query = (operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'query' && parameter.required)
    .map((parameter) => {
      // A range's end comes a week after its start.
      const value = ['until', 'to'].includes(parameter.name)
        ? '2030-01-14T15:00:00.000Z'
        : sampleOf(document, parameter.schema ?? { type: 'string' });
      return `${parameter.name}=${encodeURIComponent(String(value))}`;
    })
    .join('&');
  const schema = operation.requestBody?.content?.['application/json']?.schema;
  return {
    ...(schema === undefined ? {} : { body: sampleOf(document, schema) }),
    query: query === '' ? '' : `?${query}`,
  };
};
