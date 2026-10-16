import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { Input } from "./input";

// Follow-up 92: every password field starts hidden and carries an eye
// inside its right end. Its label is the action it will take; toggling keeps
// the value and, for a mouse click, the focus and cursor in the field.
export function PasswordInput({
  className,
  disabled,
  ref,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const caret = useRef<[number | null, number | null] | null>(null);

  // Browsers move the caret to the start when the type changes; put it back.
  useLayoutEffect(() => {
    const field = input.current;
    const kept = caret.current;
    caret.current = null;
    if (field !== null && kept !== null) field.setSelectionRange(...kept);
  }, [shown]);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={(node) => {
          input.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
          return undefined;
        }}
        type={shown ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-[48px]", className)}
      />
      <button
        type="button"
        aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={shown}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const field = input.current;
          caret.current =
            field === null ? null : [field.selectionStart, field.selectionEnd];
          setShown((current) => !current);
        }}
        className="absolute top-1/2 right-[2px] flex size-[40px] -translate-y-1/2 items-center justify-center rounded-control text-texto-tenue focus-visible:shadow-foco disabled:text-deshabilitado-texto"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown ? <path d="M4 4l16 16" /> : null}
        </svg>
      </button>
    </div>
  );
}
