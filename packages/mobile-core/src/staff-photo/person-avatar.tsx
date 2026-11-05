import type { ReactNode } from "react";

type PersonAvatarProps = { name: string; photoUri: string | null; size: number };

// Stub until FIX-041's avatar lands.
export const PersonAvatar: (props: PersonAvatarProps) => ReactNode = () => null;
