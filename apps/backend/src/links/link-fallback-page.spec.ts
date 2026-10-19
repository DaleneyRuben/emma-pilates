import { renderLinkFallbackPage } from './link-fallback-page';

// ADR-0095: what a browser without the app sees. It never uses the token.
describe('renderLinkFallbackPage', () => {
  const adminWebOrigin = 'https://emma-pilates-admin.vercel.app';

  it.each([
    ['verify-email', 'confirmar tu correo'],
    ['activate-account', 'activar tu cuenta'],
    ['recover-password', 'crear tu contraseña nueva'],
    ['confirm-email-change', 'confirmar tu correo nuevo'],
  ])('tells a Client to open the %s link in the app', (purpose, action) => {
    const page = renderLinkFallbackPage({
      identityKind: 'client',
      purpose,
      token: 'secret-1',
      adminWebOrigin,
    });

    expect(page).toContain('<html lang="es">');
    expect(page).toContain(
      `Para ${action}, abre este enlace desde el teléfono`,
    );
    expect(page).toContain('la app Emma Pilates');
    expect(page).toContain(
      'href="https://play.google.com/store/apps/details?id=com.emmapilates.client"',
    );
    expect(page).not.toContain('secret-1');
    expect(page).not.toContain('Continuar en el navegador');
  });

  it.each([
    ['activate-account', 'activar tu cuenta'],
    ['recover-password', 'crear tu contraseña nueva'],
  ])(
    'offers a Staff Member the admin web for the %s link',
    (purpose, action) => {
      const page = renderLinkFallbackPage({
        identityKind: 'staff',
        purpose,
        token: 'secret/1&x',
        adminWebOrigin,
      });

      expect(page).toContain(`Para ${action}, abre este enlace`);
      expect(page).toContain('la app Emma Pilates Staff');
      expect(page).toContain(
        'href="https://play.google.com/store/apps/details?id=com.emmapilates.staff"',
      );
      expect(page).toContain(
        'href="https://emma-pilates-admin.vercel.app/crear-contrasena?token=secret%2F1%26x"',
      );
      expect(page).toContain('Continuar en el navegador');
    },
  );

  it('leaves out the browser option when the link has no token', () => {
    const page = renderLinkFallbackPage({
      identityKind: 'staff',
      purpose: 'recover-password',
      token: null,
      adminWebOrigin,
    });

    expect(page).not.toBeNull();
    expect(page).not.toContain('crear-contrasena');
  });

  it.each([
    ['client', 'unknown'],
    ['staff', 'verify-email'],
    ['staff', 'confirm-email-change'],
  ] as const)('has no page for the %s %s link', (identityKind, purpose) => {
    expect(
      renderLinkFallbackPage({
        identityKind,
        purpose,
        token: 'secret-1',
        adminWebOrigin,
      }),
    ).toBeNull();
  });
});
