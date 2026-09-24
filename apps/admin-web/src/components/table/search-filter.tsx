import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";

const settleMilliseconds = 300;

/**
 * A list's free-text search (ADR-0062 allowlists it like any filter). The
 * route search owns the value (ADR-0042); typing settles for a moment before
 * it reaches the address, so each keystroke does not become a request.
 */
export function SearchFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  const latest = useRef(onChange);

  // The address changed from elsewhere (back button, a link): show it.
  if (value !== shown) {
    setShown(value);
    setText(value);
  }

  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (text.trim() === value) return undefined;
    const timer = setTimeout(
      () => latest.current(text.trim()),
      settleMilliseconds,
    );
    return () => clearTimeout(timer);
  }, [text, value]);

  // The native search clear button paints outside the closed palette, so
  // it is hidden; clearing the text does the same.
  return (
    <div className="relative w-full max-w-[380px]">
      <Search
        size={16}
        strokeWidth={1.6}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-muy-tenue"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="h-[38px] pl-9 text-nota [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  );
}
