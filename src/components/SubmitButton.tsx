"use client";

import { useFormStatus } from "react-dom";

// Wraps every form submit so a double-tap (very common on the driver's
// delivery form when the network feels slow) can't create a duplicate
// delivery/customer/adjustment row. Disables itself and shows a loading
// label the instant the tap registers, so it also *feels* fast even if the
// network round-trip itself takes a second.
export function SubmitButton({
  children,
  pendingText = "Saving...",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const className = variant === "primary" ? "btn-primary" : "btn-secondary";

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
