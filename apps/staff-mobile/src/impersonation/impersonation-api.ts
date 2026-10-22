import {
  endCurrentImpersonation,
  startImpersonation,
  type ImpersonationDto,
} from "@pilates/api-contracts";

export type ImpersonationApi = {
  /** ADR-0100: see the Staff app as this Staff Member for 30 minutes. */
  start: (staffMemberId: string) => Promise<ImpersonationDto>;
  /** «Salir»: end it before its time. */
  end: () => Promise<void>;
};

function requireSuccessfulResponse({ status }: { status: number }): void {
  if (status < 200 || status >= 300) {
    throw new Error("The impersonation request could not be completed");
  }
}

export function createImpersonationApi(fetcher: typeof globalThis.fetch): ImpersonationApi {
  return {
    async start(staffMemberId) {
      const response = await startImpersonation({ staffMemberId }, undefined, fetcher);
      requireSuccessfulResponse(response);
      return response.data as ImpersonationDto;
    },
    async end() {
      const response = await endCurrentImpersonation(undefined, fetcher);
      requireSuccessfulResponse(response);
    },
  };
}
