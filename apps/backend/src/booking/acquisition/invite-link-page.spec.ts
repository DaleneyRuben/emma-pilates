import { inviteLinkDestination } from './invite-link-page';

const android =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';
const desktop =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15';
const lucia = { code: 'LUCIA', holderFirstName: 'Lucía', freeClass: true };
const page = (destination: ReturnType<typeof inviteLinkDestination>) =>
  destination.kind === 'page' ? destination.html : '';

// Walkthrough n.º 13 (CW01, CW01b, CW01c): the link a Client shares.
describe('the invite link', () => {
  it('sends Android straight to Google Play with the code as the install referrer', () => {
    expect(
      inviteLinkDestination({ userAgent: android, invite: lucia }),
    ).toEqual({
      kind: 'redirect',
      location:
        'https://play.google.com/store/apps/details?id=com.emmapilates.client&referrer=invite_code%3DLUCIA',
    });
  });

  it('gives an iPhone one button that copies the code and opens the App Store', () => {
    const html = page(
      inviteLinkDestination({ userAgent: iphone, invite: lucia }),
    );

    expect(html).toContain('Lucía te regala tu primera clase');
    expect(html).toContain('SU CÓDIGO');
    expect(html).toContain('>LUCIA<');
    expect(html).toContain('Copiar código y abrir App Store');
    expect(html).toContain('https://apps.apple.com/app/id6838534444');
    expect(html).not.toContain('Google Play');
  });

  it('gives a computer both stores', () => {
    const html = page(
      inviteLinkDestination({ userAgent: desktop, invite: lucia }),
    );

    expect(html).toContain('>App Store<');
    expect(html).toContain('>Google Play<');
    expect(html).not.toContain('Copiar código');
  });

  it('carries a preview card for WhatsApp', () => {
    const html = page(
      inviteLinkDestination({ userAgent: 'WhatsApp/2.24', invite: lucia }),
    );

    expect(html).toContain(
      '<meta property="og:title" content="Lucía te regala tu primera clase">',
    );
    expect(html).toContain(
      '<meta property="og:site_name" content="Emma Pilates Studio">',
    );
    expect(html).toMatch(
      /<meta property="og:image" content="https:\/\/[^"]+\.png">/,
    );
  });

  it('still leads to the stores when nobody holds the code', () => {
    const html = page(
      inviteLinkDestination({ userAgent: iphone, invite: null }),
    );

    expect(html).toContain('Tu primera clase en Emma Pilates Studio');
    expect(html).not.toContain('SU CÓDIGO');
    expect(inviteLinkDestination({ userAgent: android, invite: null })).toEqual(
      {
        kind: 'redirect',
        location:
          'https://play.google.com/store/apps/details?id=com.emmapilates.client',
      },
    );
  });

  it('escapes what it prints', () => {
    const html = page(
      inviteLinkDestination({
        userAgent: desktop,
        invite: { code: 'A<B', holderFirstName: '<script>' },
      }),
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  // Review (testing session): a code that opens no Guest Pass, a Trainer's
  // or a Client's without a paid Plan in force, promises no free class.
  it('promises no free class for a code that opens none', () => {
    const html = page(
      inviteLinkDestination({
        userAgent: desktop,
        invite: { ...lucia, freeClass: false },
      }),
    );

    expect(html).toContain('Lucía te invita a Emma Pilates Studio');
    expect(html).toContain('Usa su código LUCIA al crear tu cuenta.');
    expect(html).not.toContain('gratis');
    expect(html).not.toContain('te regala');
  });

  // CW01c: Lora and Work Sans, the block in the middle of the window, and
  // the code card lifted by its shadow.
  it('draws the board: its fonts, centred, with the card shadow', () => {
    const html = page(
      inviteLinkDestination({ userAgent: desktop, invite: lucia }),
    );

    expect(html).toContain(
      'https://fonts.googleapis.com/css2?family=Lora:wght@500&family=Work+Sans:wght@400;700&display=swap',
    );
    expect(html).toMatch(/<body[^>]*min-height:100vh[^>]*align-items:center/);
    expect(html).toContain('box-shadow:0 10px 28px rgba(147,97,93,.30)');
  });
});
