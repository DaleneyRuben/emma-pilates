import type { ComponentProps } from "react";
import { Input } from "./input";

export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  return <Input type="password" {...props} />;
}
