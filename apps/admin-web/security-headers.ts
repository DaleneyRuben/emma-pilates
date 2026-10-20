// WEB-030: the headers every admin web response carries. Vercel sends them
// from vercel.json (kept equal to this list by a spec); `vite preview`, which
// the Playwright journeys run against, sends them from here. Scripts, styles,
// images, and API calls stay on this origin; fonts come from Google Fonts;
// image previews of a picked file are `blob:` URLs.
export const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' blob: data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000",
};
