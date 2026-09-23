import {
  compareContracts,
  type OpenApiDocument,
} from './contract-compatibility';

const document = (
  paths: OpenApiDocument['paths'],
  schemas: Record<string, unknown> = {},
): OpenApiDocument => ({ paths, components: { schemas } });

const bookingDto = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    state: { type: 'string', enum: ['booked', 'cancelled'] },
    note: { type: 'string', nullable: true },
    items: { type: 'array', items: { $ref: '#/components/schemas/ItemDto' } },
  },
  required: ['id', 'state', 'items'],
};
const itemDto = {
  type: 'object',
  properties: { label: { type: 'string' } },
  required: ['label'],
};

const operation = (overrides: Record<string, unknown> = {}) => ({
  operationId: 'readBooking',
  parameters: [
    {
      name: 'bookingId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    {
      name: 'expand',
      in: 'query',
      required: false,
      schema: { type: 'string' },
    },
  ],
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
            kind: { type: 'string', enum: ['a', 'b'] },
          },
          required: ['reason'],
        },
      },
    },
  },
  responses: {
    '200': {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/BookingDto' },
        },
      },
    },
  },
  ...overrides,
});

const previous = document(
  { '/api/v1/bookings/{bookingId}': { post: operation() } },
  { BookingDto: bookingDto, ItemDto: itemDto },
);

const withSchemas = (schemas: Record<string, unknown>) =>
  document(previous.paths, {
    BookingDto: bookingDto,
    ItemDto: itemDto,
    ...schemas,
  });

const rules = (current: OpenApiDocument) =>
  compareContracts(previous, current).breaking.map((change) => change.rule);

describe('compareContracts', () => {
  it('accepts an identical or purely additive contract', () => {
    const additive = document(
      {
        '/api/v1/bookings/{bookingId}': {
          post: operation({
            parameters: [
              ...(operation().parameters as unknown[]),
              {
                name: 'page',
                in: 'query',
                required: false,
                schema: { type: 'number' },
              },
            ],
          }),
        },
        '/api/v1/new': { get: operation({ operationId: 'newOne' }) },
      },
      {
        BookingDto: {
          ...bookingDto,
          properties: { ...bookingDto.properties, extra: { type: 'string' } },
        },
        ItemDto: itemDto,
      },
    );

    expect(compareContracts(previous, previous)).toEqual({
      breaking: [],
      warnings: [],
    });
    expect(compareContracts(previous, additive)).toEqual({
      breaking: [],
      warnings: [],
    });
  });

  it('reports a removed operation or success response', () => {
    expect(
      rules(document({}, { BookingDto: bookingDto, ItemDto: itemDto })),
    ).toEqual(['operation_removed']);
    expect(
      rules(
        document(
          {
            '/api/v1/bookings/{bookingId}': {
              post: operation({
                responses: { '201': operation().responses['200'] },
              }),
            },
          },
          { BookingDto: bookingDto, ItemDto: itemDto },
        ),
      ),
    ).toEqual(['response_removed']);
  });

  it('reports response fields that disappear, become optional, become nullable, or change type, through refs and arrays', () => {
    const { note: _note, ...withoutNote } = bookingDto.properties;
    expect(
      rules(
        withSchemas({ BookingDto: { ...bookingDto, properties: withoutNote } }),
      ),
    ).toEqual(['response_property_removed']);
    expect(
      rules(
        withSchemas({
          BookingDto: { ...bookingDto, required: ['id', 'items'] },
        }),
      ),
    ).toEqual(['response_property_optional']);
    expect(
      rules(
        withSchemas({
          BookingDto: {
            ...bookingDto,
            properties: {
              ...bookingDto.properties,
              id: { type: 'string', nullable: true },
            },
          },
        }),
      ),
    ).toEqual(['response_property_nullable']);
    expect(
      rules(
        withSchemas({
          ItemDto: { ...itemDto, properties: { label: { type: 'number' } } },
        }),
      ),
    ).toEqual(['type_changed']);
  });

  it('warns, without failing, when a response enum gains a value', () => {
    const current = withSchemas({
      BookingDto: {
        ...bookingDto,
        properties: {
          ...bookingDto.properties,
          state: {
            type: 'string',
            enum: ['booked', 'cancelled', 'rescheduled'],
          },
        },
      },
    });

    expect(compareContracts(previous, current)).toEqual({
      breaking: [],
      warnings: [
        expect.objectContaining({
          rule: 'response_enum_value_added',
          location: 'POST /api/v1/bookings/{bookingId} 200 .state',
        }),
      ],
    });
  });

  it('reports request changes an older client cannot satisfy', () => {
    const base = operation();
    const body = base.requestBody.content['application/json'].schema;
    const change = (overrides: Record<string, unknown>) =>
      rules(
        document(
          { '/api/v1/bookings/{bookingId}': { post: operation(overrides) } },
          { BookingDto: bookingDto, ItemDto: itemDto },
        ),
      );

    expect(
      change({
        parameters: [
          ...(base.parameters as unknown[]),
          {
            name: 'branchId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
      }),
    ).toEqual(['request_parameter_added_required']);
    expect(change({ parameters: [base.parameters[0]] })).toEqual([
      'request_parameter_removed',
    ]);
    expect(
      change({
        requestBody: {
          content: {
            'application/json': {
              schema: { ...body, required: ['reason', 'kind'] },
            },
          },
        },
      }),
    ).toEqual(['request_property_required']);
    expect(
      change({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                ...body,
                properties: {
                  ...body.properties,
                  kind: { type: 'string', enum: ['a'] },
                },
              },
            },
          },
        },
      }),
    ).toEqual(['request_enum_value_removed']);
    expect(
      change({
        requestBody: {
          content: {
            'application/json': {
              schema: {
                ...body,
                properties: { reason: body.properties.reason },
              },
            },
          },
        },
      }),
    ).toEqual(['request_property_removed']);
  });

  it('skips operations exempted as admin-web only', () => {
    expect(
      compareContracts(previous, document({}, {}), {
        exemptOperationIds: ['readBooking'],
      }),
    ).toEqual({ breaking: [], warnings: [] });
  });
});
