import type { ReactNode } from "react";

type StaffFaceProps = {
  fetcher: typeof globalThis.fetch;
  name: string;
  photo: { imageAssetId: string } | null;
  size: number;
  variant?: "display" | "thumbnail";
};

// Stub until FIX-041's staff face lands.
export const StaffFace: (props: StaffFaceProps) => ReactNode = () => null;
