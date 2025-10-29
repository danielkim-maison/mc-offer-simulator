import * as React from "react";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = ({ className = "", ...props }: LabelProps) => {
  return <label className={`text-neutral-300 text-sm ${className}`} {...props} />;
};
