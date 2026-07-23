"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: HTMLElement | null;
  setTriggerRef: (el: HTMLElement | null) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select primitives must be used within Select");
  return ctx;
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null);
  const ctx = useMemo(
    () => ({ value, onValueChange, open, setOpen, triggerRef, setTriggerRef }),
    [value, onValueChange, open, triggerRef],
  );
  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setOpen, setTriggerRef, open } = useSelectContext();
  return (
    <button
      type="button"
      ref={(el) => setTriggerRef(el)}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
      <span aria-hidden className="text-xs text-muted-foreground">
        ▾
      </span>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext();
  return <span>{value || placeholder || "Select an option"}</span>;
}

export function SelectContent({ children }: { children: ReactNode }) {
  const { open, setOpen } = useSelectContext();
  if (!open) return null;
  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
      <div onClick={() => setOpen(false)}>{children}</div>
    </div>
  );
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const { onValueChange } = useSelectContext();
  return (
    <div
      role="option"
      onClick={() => onValueChange(value)}
      className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
    >
      {children}
    </div>
  );
}
