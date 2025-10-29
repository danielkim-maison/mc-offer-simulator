import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className = "", ...rest }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/20";
    const style =
      variant === "secondary"
        ? "mc-btn-secondary text-neutral-100 hover:brightness-110"
        : "mc-btn hover:brightness-110";
    return <button ref={ref} className={`${base} ${style} ${className}`} {...rest} />;
  }
);
Button.displayName = "Button";
