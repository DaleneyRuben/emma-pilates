import { isStorableMobile } from '../../../phone/contact-phone';
import { parseStudioParams } from './params';

const ana = { email: ' Ana@Example.com ', name: ' Ana ', phone: '7123 4567' };

describe('the Android closed-test studio params', () => {
  it('needs nothing, and its staff names never say «prueba»', () => {
    const parsed = parseStudioParams({});

    expect(parsed.administratorName).toBe('Emma Pilates Studio');
    expect(parsed.clients).toEqual([]);
    expect(parsed.courtesyAccessEndsOn).toBeNull();
    expect(
      parsed.staff.map((member) => [member.email, member.name, member.role]),
    ).toEqual([
      ['emmapilatesstudio+instructora1@gmail.com', 'Instructora 1', 'trainer'],
      ['emmapilatesstudio+instructora2@gmail.com', 'Instructora 2', 'trainer'],
      ['emmapilatesstudio+asistente@gmail.com', 'Asistente', 'assistant'],
      [
        'emmapilatesstudio+coordinadora@gmail.com',
        'Coordinadora',
        'coordinator',
      ],
      [
        'emmapilatesstudio+nutricionista@gmail.com',
        'Nutricionista',
        'nutritionist',
      ],
    ]);
  });

  it('takes the Clients, the names, and the courtesy end it is given', () => {
    const parsed = parseStudioParams({
      administratorName: 'Emma Rojas',
      staff: { asistente: { name: 'Lucía Mamani', phone: '+591 61234567' } },
      clients: [ana],
      courtesyAccessEndsOn: '2027-01-31',
    });

    expect(parsed.administratorName).toBe('Emma Rojas');
    expect(parsed.staff.find((member) => member.key === 'asistente')).toEqual({
      key: 'asistente',
      email: 'emmapilatesstudio+asistente@gmail.com',
      name: 'Lucía Mamani',
      phone: '+591 61234567',
      role: 'assistant',
    });
    expect(parsed.clients).toEqual([
      { email: 'ana@example.com', name: 'Ana', phone: '+591 71234567' },
    ]);
    expect(parsed.courtesyAccessEndsOn).toEqual(
      new Date('2027-01-31T00:00:00.000Z'),
    );
  });

  // A tester's real Bolivian mobile starts with 5, which libphonenumber knows.
  it('takes a Bolivian mobile starting with 5', () => {
    const parsed = parseStudioParams({
      clients: [{ ...ana, phone: '+591 57007684' }],
      staff: { asistente: { phone: '5700 7684' } },
    });

    expect(parsed.clients[0].phone).toBe('+591 57007684');
    expect(parsed.staff.find((m) => m.key === 'asistente')!.phone).toBe(
      '+591 57007684',
    );
  });

  it('gives every Staff Member a distinct placeholder mobile', () => {
    const phones = parseStudioParams({}).staff.map((member) => member.phone);

    expect(new Set(phones).size).toBe(5);
    expect(phones.every(isStorableMobile)).toBe(true);
  });

  it.each([
    [{ giftPlan: '8 clases' }, 'param_unknown: giftPlan'],
    [{ staff: { recepcion: {} } }, 'staff_unknown: recepcion'],
    [{ staff: { asistente: { phone: '123' } } }, 'staff_phone_invalid'],
    [{ administratorName: ' ' }, 'administrator_name_invalid'],
    [{ clients: 'ana' }, 'clients_invalid'],
    [{ clients: [{ ...ana, email: 'ana' }] }, 'client_email_invalid'],
    [{ clients: [{ ...ana, name: '' }] }, 'client_name_missing'],
    [{ clients: [{ ...ana, phone: '12' }] }, 'client_phone_invalid'],
    // A La Paz fixed line is no mobile.
    [{ clients: [{ ...ana, phone: '2 2123456' }] }, 'client_phone_invalid'],
    [{ clients: [{ ...ana, phone: undefined }] }, 'client_phone_invalid'],
    [
      { clients: [ana, { ...ana, email: 'ANA@example.com' }] },
      'client_email_repeated',
    ],
    [
      {
        clients: Array.from({ length: 21 }, (_, index) => ({
          ...ana,
          email: `t${index}@example.com`,
        })),
      },
      'too_many_clients',
    ],
    [{ courtesyAccessEndsOn: '31/01/2027' }, 'courtesy_ends_on_invalid'],
  ])('refuses %j', (params, code) => {
    expect(() => parseStudioParams(params)).toThrow(code);
  });
});
