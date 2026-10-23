import type { StudioRulesDto } from "@pilates/api-contracts";

export const formatCancellationWindow: (minutes: number) => string = () => "";

export const useStudioRules: (
  fetcher: typeof globalThis.fetch,
) => StudioRulesDto | undefined = () => undefined;
