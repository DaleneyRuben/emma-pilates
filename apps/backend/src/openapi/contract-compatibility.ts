// Mobile compatibility check (ADR-0016, BE-003): compares the contract the
// previous mobile release was built against with the current one and reports
// changes that release could not tolerate. Additive changes pass.

type Schema = {
  $ref?: string;
  type?: string;
  format?: string;
  nullable?: boolean;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  allOf?: Schema[];
};

type Parameter = {
  name: string;
  in: string;
  required?: boolean;
  schema?: Schema;
};

type Operation = {
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: Schema }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
};

export type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, unknown> };
};

export type CompatibilityRule =
  | 'operation_removed'
  | 'response_removed'
  | 'response_property_removed'
  | 'response_property_optional'
  | 'response_property_nullable'
  | 'type_changed'
  | 'request_parameter_removed'
  | 'request_parameter_added_required'
  | 'request_property_removed'
  | 'request_property_required'
  | 'request_body_added_required'
  | 'request_enum_value_removed'
  | 'response_enum_value_added';

export type CompatibilityChange = {
  rule: CompatibilityRule;
  location: string;
  detail: string;
};

export type CompatibilityReport = {
  breaking: CompatibilityChange[];
  warnings: CompatibilityChange[];
};

const methods = ['get', 'put', 'post', 'delete', 'patch'] as const;

type Direction = 'request' | 'response';

// "POST /x 200 .items[].label": a space before the first field, dots after.
const propertyLocation = (location: string, name: string): string =>
  location.includes(' .') ? `${location}.${name}` : `${location} .${name}`;

class Comparison {
  readonly breaking: CompatibilityChange[] = [];
  readonly warnings: CompatibilityChange[] = [];

  constructor(
    private readonly previous: OpenApiDocument,
    private readonly current: OpenApiDocument,
  ) {}

  report(rule: CompatibilityRule, location: string, detail: string): void {
    const change = { rule, location, detail };
    if (rule === 'response_enum_value_added') this.warnings.push(change);
    else this.breaking.push(change);
  }

  // Follows `$ref`s and folds `allOf` (Nest's nullable-object pattern) into one
  // schema; returns the component names visited, for cycle protection.
  private resolve(
    document: OpenApiDocument,
    schema: Schema | undefined,
    refs: string[] = [],
  ): { schema: Schema; refs: string[] } {
    if (schema === undefined) return { schema: {}, refs };
    if (schema.$ref !== undefined) {
      const name = schema.$ref.replace('#/components/schemas/', '');
      const target = document.components?.schemas?.[name] as Schema | undefined;
      const resolved = this.resolve(document, target, [...refs, name]);
      return {
        schema: {
          ...resolved.schema,
          nullable: schema.nullable ?? resolved.schema.nullable,
        },
        refs: resolved.refs,
      };
    }
    if (schema.allOf !== undefined) {
      const { allOf, ...rest } = schema;
      return allOf.reduce<{ schema: Schema; refs: string[] }>(
        (merged, part) => {
          const resolved = this.resolve(document, part, merged.refs);
          return {
            schema: {
              ...resolved.schema,
              ...merged.schema,
              properties: {
                ...resolved.schema.properties,
                ...merged.schema.properties,
              },
              required: [
                ...(resolved.schema.required ?? []),
                ...(merged.schema.required ?? []),
              ],
              nullable: merged.schema.nullable ?? resolved.schema.nullable,
            },
            refs: resolved.refs,
          };
        },
        { schema: rest, refs },
      );
    }
    return { schema, refs };
  }

  compareSchema(
    before: Schema | undefined,
    after: Schema | undefined,
    direction: Direction,
    location: string,
    seen: Set<string> = new Set(),
  ): void {
    const previous = this.resolve(this.previous, before);
    const current = this.resolve(this.current, after);
    const key = `${direction}:${previous.refs.join('>')}|${current.refs.join('>')}`;
    if (previous.refs.length > 0 && seen.has(key)) return;
    const visited = new Set(seen).add(key);
    const was = previous.schema;
    const is = current.schema;

    const wasType = was.type ?? (was.properties ? 'object' : undefined);
    const isType = is.type ?? (is.properties ? 'object' : undefined);
    if (wasType !== undefined && isType !== undefined && wasType !== isType) {
      this.report('type_changed', location, `${wasType} → ${isType}`);
      return;
    }

    if (
      direction === 'response' &&
      was.nullable !== true &&
      is.nullable === true
    ) {
      this.report('response_property_nullable', location, 'may now be null');
    }

    if (was.enum !== undefined && is.enum !== undefined) {
      if (direction === 'response') {
        const added = is.enum.filter((value) => !was.enum!.includes(value));
        if (added.length > 0) {
          this.report(
            'response_enum_value_added',
            location,
            `adds ${added.join(', ')}`,
          );
        }
      } else {
        const removed = was.enum.filter((value) => !is.enum!.includes(value));
        if (removed.length > 0) {
          this.report(
            'request_enum_value_removed',
            location,
            `drops ${removed.join(', ')}`,
          );
        }
      }
    }

    if (was.items !== undefined || is.items !== undefined) {
      this.compareSchema(
        was.items,
        is.items,
        direction,
        `${location}[]`,
        visited,
      );
    }

    const wasProperties = was.properties ?? {};
    const isProperties = is.properties ?? {};
    const wasRequired = new Set(was.required ?? []);
    const isRequired = new Set(is.required ?? []);

    Object.entries(wasProperties).forEach(([name, schema]) => {
      const at = propertyLocation(location, name);
      if (!(name in isProperties)) {
        this.report(
          direction === 'response'
            ? 'response_property_removed'
            : 'request_property_removed',
          at,
          'no longer in the schema',
        );
        return;
      }
      if (
        direction === 'response' &&
        wasRequired.has(name) &&
        !isRequired.has(name)
      ) {
        this.report(
          'response_property_optional',
          at,
          'is no longer always present',
        );
      }
      if (
        direction === 'request' &&
        !wasRequired.has(name) &&
        isRequired.has(name)
      ) {
        this.report('request_property_required', at, 'is now required');
      }
      this.compareSchema(schema, isProperties[name], direction, at, visited);
    });

    if (direction === 'request') {
      Object.keys(isProperties)
        .filter((name) => !(name in wasProperties) && isRequired.has(name))
        .forEach((name) =>
          this.report(
            'request_property_required',
            propertyLocation(location, name),
            'new and required',
          ),
        );
    }
  }
}

const jsonSchema = (content: Record<string, { schema?: Schema }> | undefined) =>
  content?.['application/json']?.schema;

export const compareContracts = (
  previous: OpenApiDocument,
  current: OpenApiDocument,
  options: { exemptOperationIds?: string[] } = {},
): CompatibilityReport => {
  const comparison = new Comparison(previous, current);
  const exempt = new Set(options.exemptOperationIds ?? []);

  Object.entries(previous.paths).forEach(([path, item]) => {
    methods.forEach((method) => {
      const before = item[method] as Operation | undefined;
      if (before === undefined) return;
      if (before.operationId !== undefined && exempt.has(before.operationId))
        return;
      const name = `${method.toUpperCase()} ${path}`;
      const after = current.paths[path]?.[method] as Operation | undefined;
      if (after === undefined) {
        comparison.report('operation_removed', name, before.operationId ?? '');
        return;
      }

      const parameterKey = (parameter: Parameter) =>
        `${parameter.in}:${parameter.name}`;
      const beforeParameters = new Map(
        (before.parameters ?? []).map((p) => [parameterKey(p), p]),
      );
      const afterParameters = new Map(
        (after.parameters ?? []).map((p) => [parameterKey(p), p]),
      );
      beforeParameters.forEach((parameter, key) => {
        const next = afterParameters.get(key);
        if (next === undefined) {
          comparison.report(
            'request_parameter_removed',
            `${name} ${key}`,
            'no longer accepted',
          );
          return;
        }
        if (parameter.required !== true && next.required === true) {
          comparison.report(
            'request_parameter_added_required',
            `${name} ${key}`,
            'is now required',
          );
        }
        comparison.compareSchema(
          parameter.schema,
          next.schema,
          'request',
          `${name} ${key}`,
        );
      });
      afterParameters.forEach((parameter, key) => {
        if (!beforeParameters.has(key) && parameter.required === true) {
          comparison.report(
            'request_parameter_added_required',
            `${name} ${key}`,
            'new and required',
          );
        }
      });

      const beforeBody = jsonSchema(before.requestBody?.content);
      const afterBody = jsonSchema(after.requestBody?.content);
      if (
        beforeBody === undefined &&
        afterBody !== undefined &&
        after.requestBody?.required === true
      ) {
        comparison.report(
          'request_body_added_required',
          `${name} request`,
          'new and required',
        );
      } else if (beforeBody !== undefined && afterBody !== undefined) {
        comparison.compareSchema(
          beforeBody,
          afterBody,
          'request',
          `${name} request`,
        );
      }

      Object.entries(before.responses ?? {})
        .filter(([status]) => status.startsWith('2'))
        .forEach(([status, response]) => {
          const next = after.responses?.[status];
          if (next === undefined) {
            comparison.report(
              'response_removed',
              `${name} ${status}`,
              'status no longer returned',
            );
            return;
          }
          const beforeSchema = jsonSchema(response.content);
          if (beforeSchema === undefined) return;
          comparison.compareSchema(
            beforeSchema,
            jsonSchema(next.content),
            'response',
            `${name} ${status}`,
          );
        });
    });
  });

  return { breaking: comparison.breaking, warnings: comparison.warnings };
};
