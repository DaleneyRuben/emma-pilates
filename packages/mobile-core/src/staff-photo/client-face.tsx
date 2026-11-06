import type { ReactNode } from "react";

type ClientFaceProps = {
  fetcher: typeof globalThis.fetch;
  name: string;
  photo: { imageAssetId: string } | null;
  size: number;
};

// Stub until finding n.º 30's client face lands.
export const ClientFace: (props: ClientFaceProps) => ReactNode = () => null;
