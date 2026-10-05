import { HTMLAttributes } from "react";

export function Card({
  className = "",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={`rounded-card border border-ink-700 bg-ink-800 p-4 shadow-sm shadow-black/20 transition-all sm:p-5 ${
        interactive ? "hover:border-mist-400 hover:shadow-md hover:shadow-black/30" : ""
      } ${className}`}
      {...props}
    />
  );
}
