interface ImportMetaEnv {
  // Set on Vercel Production only (EXT-011), so previews report nothing.
  readonly VITE_ERROR_REPORTING_DSN?: string;
  // Vercel's system variables, exposed to Vite builds.
  readonly VITE_VERCEL_ENV?: string;
  readonly VITE_VERCEL_GIT_COMMIT_SHA?: string;
}
