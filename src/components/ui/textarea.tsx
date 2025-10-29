import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    const base =
      "w-full min-h-[96px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-white/20";
    return <textarea ref={ref} className={`${base} ${className}`} {...props} />;
  }
);
Textarea.displayName = "Textarea";
